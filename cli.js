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

function writeQuads(quads, output, format) {
    let writer = new n3.Writer({format: cliFormatToN3(format)});
    quads.forEach(quad => writer.addQuad(quad.subject, quad.predicate, quad.object));
    writer.end((error, result) => {
        if (error) throw new CliError(error);
        if (!output) {
            console.log(result);
        } else {
            fs.writeFileSync(output, result);
        }
    });
}

let args = minimist(process.argv.slice(2));
if (!args.input) throw new CliError('No input file path specified');
if (args.output && !fs.existsSync(path.parse(args.output).dir)) throw new CliError(`Output directory \'${path.parse(args.output).dir}\' doesn\'t exist`);
let data = fs.readFileSync(args.input).toString();
if (args.parse) {
    utils.inputToQuads(data, utils.randomUrl(), context)
        .then(quads => writeQuads(quads, args.output, args.format))
        .catch(err => {
            throw new CliError(err.message)
        });
} else if (args.validate) {
    if (!args.shex) {
        throw new CliError('No ShEx shapes file specified');
    }
    args.service = args.service || '';
    utils.loadData(args.shex)
        .then(shapes => {
            let validator = new ShexValidator(context, shapes);
            validator.validate(data, args.service)
                .then(report => {
                    if (!args.output) console.log(report.failures);
                    else fs.writeFileSync(args.output, report.failures);
                });

        })
        .catch(err => {
            throw new CliError(err.message)
        });
}