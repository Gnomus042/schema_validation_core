const fs = require('fs');
const path = require('path');
const minimist = require('minimist');
const n3 = require('n3');

const ShexValidator = require('./shexValidator').Validator;
const utils = require('./util');

const context = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'context.json')).toString());

class CliError extends Error {
    constructor(message) {
        super(message);
        this.name = "CliError";
    }
}

function cliFormatToN3(val) {
    switch (val) {
        case undefined:
            return 'N-Quads';
        case 'nquads':
            return 'N-Quads';
        case 'ntriples':
            return 'N-Triples';
        case 'turtle':
            return 'application/turtle';
        case 'trig':
            return 'application/trig';
        default:
            throw new CliError('Unknown output format');
    }
}

function writeResult(val, args) {
    if (!args.output) {
        console.log(result);
    } else {
        fs.writeFileSync(args.output, val);
    }
}

function writeQuads(quads, output, format) {
    let writer = new n3.Writer({format: cliFormatToN3(format)});
    quads.forEach(quad => writer.addQuad(quad.subject, quad.predicate, quad.object));
    writer.end((error, result) => {
        if (error) throw new CliError(error);
        writeResult(result, args);
    });
}

async function validateShEx(data, args) {
    args.service = args.service || '';
    let shapes = await utils.loadData(args.shex);
    let validator = new ShexValidator(context, shapes);
    let report = await validator.validate(data, args.service)
    writeResult(JSON.stringify(report.failures, undefined, 2), args);
}

async function validateShacl(data, args) {
    let shapes = await utils.loadData(args.shacl);
    let subclasses, annotations;
    if (args.subclasses) {
        subclasses = await utils.loadData(args.subclasses);
    }
    if (args.annotations) {
        annotations = JSON.parse(await utils.loadData(args.annotations));
    }
    let validator = new ShaclValidator(shapes, {
        subclasses: subclasses,
        context: context,
        annotations: annotations
    });
    let report = validator.validate(data);
    writeResult(JSON.stringify(report.failures, undefined, 2), args);
}

/**
 * @param {args} args
 * @return {Promise<void>}
 */
async function main(args) {
    if (!args.input) throw new CliError('No input file path specified');
    if (args.output && !fs.existsSync(path.parse(args.output).dir)) throw new CliError(`Output directory \'${path.parse(args.output).dir}\' doesn\'t exist`);
    let data = fs.readFileSync(args.input).toString();
    if (args.parse) {
        let quads = await utils.inputToQuads(data, utils.randomUrl(), context);
        writeQuads(quads, args.output, args.format);
    } else if (args.validate) {
        if (args.shex && args.shacl) throw new CliError('Validation is possible for ShEx or SHACL, but not for both');
        else if (args.shex) await validateShEx(data, args);
        else if (args.shacl) await validateShacl(data, args);
        else throw new CliError('No shapes provided for validation');
    }
}

/**
 * @typedef {{
 *     input: string
 *     output: string|undefined
 *     parse: boolean|undefined
 *     format: string|undefined
 *     validate: boolean|undefined
 *     shex: string|undefined
 *     shacl: string|undefined
 * }} args - possible options for args
 */

let args = minimist(process.argv.slice(2));
main(args);

