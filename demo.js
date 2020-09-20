const ShexValidator = require('./shexValidator.js').Validator;
const ShaclValidator = require('./shaclValidator.js').Validator;
const utils = require('./util.js');
const fs = require('fs')

async function validateLocal() {
    let shexShapes = await utils.loadData('C:\\Users\\anast\\Projects\\Schema\\schema-validation-node\\test\\data\\shapes\\Schema.shex');

    let data = fs.readFileSync('C:\\Users\\anast\\Projects\\Schema\\schema-validation-node\\test\\data\\tests\\Thing4-Microdata.txt').toString();

    return (new ShexValidator(shexShapes)).validate(data, 'https://schema.org/validation#Thing');
}

async function validateGlobal() {
    let context = await utils.loadData('http://127.0.0.1:5000/context');
    let shexShapes = await utils.loadData('http://127.0.0.1:5000/shex/shapes');

    let data = fs.readFileSync('C:\\Users\\anast\\Projects\\Schema\\shex-testing\\data\\json-ld Recipe.txt').toString();
    return (new ShexValidator(context, shexShapes)).validate(data, '');
}

async function validateShaclLocal() {
    let context = await utils.loadData('C:\\Users\\anast\\Projects\\Schema\\schema-validation-node\\test\\utils\\context.json');
    let shaclShapes = await utils.loadData('C:\\Users\\anast\\Projects\\Schema\\schema-validation-node\\test\\utils\\schema.shacl');

    let subclasses = await utils.loadData('C:\\Users\\anast\\Projects\\Schema\\schema-validation-node\\test\\utils\\schema-subclasses.ttl');
    let annotations = {url: 'http://schema.org/url', description: 'http://schema.org/description'};
    let validator = new ShaclValidator(shaclShapes, {
        context: context,
       // annotations: annotations,
        subclasses: subclasses
    });

    let data = fs.readFileSync('C:\\Users\\anast\\Projects\\Schema\\schema-validation-node\\test\\tests\\rdfa Recipe.txt').toString();
    return validator.validate(data);
}

validateLocal().then(res => console.log(JSON.stringify(res.failures, undefined, 2)));