const shex = require('./lib/shex.js');
const utils = require('./util.js');
const errors = require('./errors.js');

const TYPE = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type';

class ValidationReport {
    /**
     * @param {object} jsonReport - report from shex.js, which needs to be simplified
     * @param {object} schema - parsed shapes in ShExJ format
     */
    constructor(jsonReport, schema) {
        this.failures = [];
        this.shapes = new Map();
        schema.shapes.forEach(shape => {
            this.shapes.set(shape.id, this.getShapeCore(shape));
        });
        this.simplify(jsonReport, undefined, undefined);
        this.annotationProperties = {
            URL: 'http://schema.org/url',
            DESCRIPTION: 'http://schema.org/description',
            IDENTIFIER: 'http://schema.org/identifier',
        };
    }

    /**
     * Simplifies shex.js nested report into a linear structure
     * @param {object} jsonReport
     * @param {string|undefined} parentNode
     * @param {string|undefined} parentShape
     */
    simplify(jsonReport, parentNode, parentShape) {
        // STEP 1: if report doesn't contain errors, MissingProperty @type or failures
        // that doesn't need to be added, return
        if (jsonReport.type === 'ShapeAndResults' ||
            jsonReport.type === 'ShapeOrResults' ||
            jsonReport.property === TYPE ||
            jsonReport.constraint && jsonReport.constraint.predicate === TYPE ||
            jsonReport.type === 'NodeConstraintViolation' ||
            jsonReport.type === 'ShapeOrFailure') {
            return;
        }

        // STEP 2: if array or intermediate nested structure, simplify nested values
        if (Array.isArray(jsonReport)) {
            jsonReport.forEach(err => this.simplify(err, parentNode, parentShape));
            return;
        }
        if (jsonReport.type === 'ShapeAndFailure' ||
            jsonReport.type === 'Failure' ||
            jsonReport.type === 'SemActFailure' ||
            jsonReport.type === 'FailureList' ||
            jsonReport.type === 'ExtendedResults' ||
            jsonReport.type === 'ExtensionFailure' ||
            (!jsonReport.type) && jsonReport.errors) {
            const node = jsonReport.node;
            this.simplify(jsonReport.errors, node || parentNode, jsonReport.shape || parentShape);
            return;
        }
        // STEP 3: handle closed shape errors
        if (jsonReport.type === 'ClosedShapeViolation') {
            jsonReport.unexpectedTriples.forEach(trpl => {
                let failure = {
                    type: jsonReport.type,
                    property: trpl.predicate,
                    message: `Unexpected property ${trpl.predicate}`,
                    node: parentNode,
                    shape: parentShape
                }
                this.failures.push(failure);
            });
            return;
        }
        // STEP 4: fill out the failure
        const failure = {
            type: jsonReport.type,
            property: jsonReport.property || (jsonReport.constraint && jsonReport.constraint.predicate),
            message: '',
            node: (jsonReport.triple && jsonReport.triple.subject) || parentNode,
            shape: parentShape,
        };
        switch (jsonReport.type) {
            case 'TypeMismatch': failure.message = `Value provided for property ${failure.property} has a wrong type`;
                this.simplify(jsonReport.errors, undefined, undefined);
                break;
            case 'MissingProperty': failure.message = `Property ${failure.property} not found`; break;
            case 'ExcessTripleViolation': failure.message = `Property ${failure.property} has a cardinality issue`; break;
            case 'BooleanSemActFailure': if (!jsonReport.ctx.predicate) return;
                failure.message = `Property ${failure.property} failed semantic action with code js:'${jsonReport.code}'`;
                break;
            default: throw new errors.ShexValidationError(`Unknown failure type ${jsonReport.type}`);
        }
        this.failures.push(failure);
    }

    /**
     * Recursively parses ShExJ Shape structure to get the core Shape with properties
     * @param {object} node
     * @returns {object}
     */
    getShapeCore(node) {
        if (node.type === 'Shape') {
            return node;
        }
        if (node.shapeExprs) {
            return node.shapeExprs
                .map(/** @param {*} nestedStruct */nestedStruct => this.getShapeCore(nestedStruct))
                .filter(/** @param {*} nestedStruct */nestedStruct => nestedStruct !== undefined);
        }
    }

    /**
     * Gets annotations for specific property in shape from the ShExJ shape
     * @param {string} shape
     * @param {string} property
     * @returns {Map<string, string>}
     */
    getAnnotations(shape, property) {
        const mapper = new Map();
        if (!this.shapes.get(shape) || this.shapes.get(shape).length === 0) return mapper;
        let propStructure = this.shapes.get(shape)[0].expression.expressions
            .filter(/** @param {{predicate: string}} x */x => x.predicate === property)[0];
        if (!propStructure || !propStructure.annotations) return mapper;
        propStructure.annotations.forEach(/** @param {{predicate: string, object:{value: string}}} x*/x => {
            mapper.set(x.predicate, x.object.value);
        });
        return mapper;
    }

    /**
     * Transforms a temporary report failures to structured data report failures
     * @returns {[StructuredDataFailure]}
     */
    toStructuredDataReport() {
        const simplified = [];
        this.failures.forEach(err => {
            let annotations = new Map();
            if (err.shape && err.property) {
                annotations = this.getAnnotations(err.shape, err.property);
            }
            simplified.push({
                property: err.property,
                message: err.message,
                url: annotations.get(this.annotationProperties.URL),
                description: annotations.get(this.annotationProperties.DESCRIPTION),
                severity: annotations.get(this.annotationProperties.IDENTIFIER) || 'error',
                services: [],
                shape: err.shape,
            });
        });
        return simplified;
    }
}

class ShexValidator {
    /**
     * @param {object} shapes - ShExJ shapes
     */
    constructor(shapes) {
        this.shapes = shapes;
    }

    /**
     * Validates data against ShEx shapes
     * @param {string} data
     * @param {string} shape -  identifier of the shape
     * @param {{ baseUrl: string|undefined }} options
     * @returns {Promise<{baseUrl: string, quads: Store, report: [StructuredDataFailure]}>}
     */
    async validate(data, shape, options={}) {
        const baseUrl = options.baseUrl || utils.randomUrl();
        const quads = await utils.inputToQuads(data, baseUrl);
        const db = shex.Util.makeN3DB(quads);
        const validator = shex.Validator.construct(this.shapes);
        const errors = new ValidationReport(validator.validate(db, [{
            node: baseUrl,
            shape: shape,
        }]), this.shapes);
        return {
            baseUrl: baseUrl,
            quads: quads,
            failures: utils.uniqueBy(errors.toStructuredDataReport(), ['property', 'shape', 'message', 'severity'])
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
 *     services: [string],
 *     shape: string
 * }} StructuredDataFailure
 */

module.exports = {Validator: ShexValidator}