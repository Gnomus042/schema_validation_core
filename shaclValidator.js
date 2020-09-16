const SHACLValidator = require('rdf-validate-shacl');
const rdf = require('rdf-ext');

const utils = require('./util.js');

class ShaclValidator {
    /**
     * @param {string} shaclSchema - shacl shapes in string format
     * @param {string} subclasses - subclasses hierarchy, that should be added to data
     * @param {object} context for json-ld context
     */
    constructor(shaclSchema, subclasses, context) {
        this.subclasses = utils.parseTurtle(subclasses);
        this.shapes = utils.parseTurtle(shaclSchema);
        this.context = context;
        this.validator = new SHACLValidator(this.shapes.getQuads(), {rdf});
        this.baseShaclUrl = 'http://www.w3.org/ns/shacl#';
    }

    /**
     * Transforms n3 store to rdf dataset
     * TODO Maybe remove
     * @param {Store} store
     * @returns {dataset}
     */
    n3ToRdfDataset(store) {
        return rdf.dataset(store)
    }

    /**
     * Transforms SHACL severity to string
     * @param {string} val
     * @returns {string}
     */
    getSeverity(val) {
        switch (val) {
            case `${this.baseShaclUrl}Violation`: return 'error';
            case `${this.baseShaclUrl}Warning`: return 'warning';
            default: return 'info';
        }
    }

    /**
     * Gets schema: annotations for some predicate
     * @param {namedNode} property - property, which should have an annotation
     * @param {namedNode} annotation - annotation predicate
     * @returns {*}
     */
    getAnnotation(property, annotation) {
        this.shapes.getQuads(property, annotation, undefined).forEach(quad => {
            return quad.object.value;
        });
    }

    /**
     * Transform standard shacl failure to structured data failure
     * @param {object} shaclFailure
     * @param {Store} shapes
     * @returns {StructuredDataFailure}
     */
    toStructuredDataFailure(shaclFailure, shapes) {
        let sourceShape = shapes.getQuads(undefined, 'http://www.w3.org/ns/shacl#property', shaclFailure.sourceShape)[0];
        return {
            property: shaclFailure.path ? shaclFailure.path.value : undefined,
            message: shaclFailure.message.length > 0 ? shaclFailure.message.map(x => x.value).join(". ") : undefined,
            url: this.getAnnotation(shaclFailure.sourceShape, rdf.namedNode("http://schema.org/url")),
            description: this.getAnnotation(shaclFailure.sourceShape, rdf.namedNode("http://schema.org/description")),
            severity: this.getSeverity(shaclFailure.severity.value),
            service: sourceShape.subject.value.replace(/.*[\\/#]/, ''),
        }
    }

    /**
     * @param {string} data
     * @returns {Promise<{baseUrl: string, quads: Store, failures: [StructuredDataFailure]}>}
     */
    async validate(data) {
        let baseUrl = utils.randomUrl();
        let quads = await utils.inputToQuads(data, baseUrl, this.context);
        let quadsWithSubclasses = quads.getQuads();
        quadsWithSubclasses.push(...this.subclasses.getQuads());
        let report = this.validator.validate(this.n3ToRdfDataset(quadsWithSubclasses)).results
            .map(x => this.toStructuredDataFailure(x, this.shapes));
        return {
            baseUrl: baseUrl,
            quads: quads,
            failures: report,
        };
    }
}

/**
 * @typedef {{
 *     property: string,
 *     message: string,
 *     url: string|undefined,
 *     description: string|undefined,
 *     severity: 'error'|'warning'|'info',
 *     service: string,
 *     shape: string
 * }} StructuredDataFailure
 */

module.exports = {
    Validator: ShaclValidator,
}