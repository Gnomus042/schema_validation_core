const SHACLValidator = require('rdf-validate-shacl');
const rdf = require('rdf-ext');

const utils = require('./util.js');

class ShaclValidator {
    constructor(shaclShapes, subclasses, context) {
        this.subclasses = utils.parseTurtle(subclasses);
        this.shapes = utils.parseTurtle(shaclShapes);
        this.context = context;
        this.validator = new SHACLValidator(this.shapes.getQuads(), {rdf});
        this.baseShaclUrl = 'http://www.w3.org/ns/shacl#';
    }

    n3ToRdfDataset(store) {
        return rdf.dataset(store)
    }

    getSeverity(val) {
        switch (val) {
            case `${this.baseShaclUrl}Violation`: return 'error';
            case `${this.baseShaclUrl}Warning`: return 'warning';
            default: return 'info';
        }
    }

    getAnnotation(predicate, object) {
        let res;
        this.shapes.getQuads(predicate, object, undefined).forEach(quad => {
            res = quad.object.value;
        });
        return res;
    }

    toStructuredDataFailure(shaclFailure) {
        let sourceShape = this.shapes.getQuads(undefined, 'http://www.w3.org/ns/shacl#property', shaclFailure.sourceShape)[0];
        return {
            property: shaclFailure.path ? shaclFailure.path.value : undefined,
            message: shaclFailure.message.length > 0 ? shaclFailure.message.map(x => x.value).join(". ") : undefined,
            url: this.getAnnotation(shaclFailure.sourceShape, rdf.namedNode("http://schema.org/url")),
            description: this.getAnnotation(shaclFailure.sourceShape, rdf.namedNode("http://schema.org/description")),
            severity: this.getSeverity(shaclFailure.severity.value),
            service: sourceShape.subject.value.replace('http://example.org/', ''),
        }
    }

    async validate(data) {
        let baseUrl = utils.randomUrl();
        let quads = await utils.inputToQuads(data, baseUrl, this.context);
        let quadsWithSubclasses = quads.getQuads();
        quadsWithSubclasses.push(...this.subclasses.getQuads());
        let report = this.validator.validate(this.n3ToRdfDataset(quadsWithSubclasses)).results
            .map(x => this.toStructuredDataFailure(x));
        return {
            baseUrl: baseUrl,
            quads: quads,
            failures: utils.uniqueBy(report, ['property']),
        };
    }
}

module.exports = {
    Validator: ShaclValidator,
}