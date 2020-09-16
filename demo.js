const ShexValidator = require('./shexValidator.js').Validator;
const ShaclValidator = require('./shaclValidator.js').Validator;
const utils = require('./util.js');
const fs = require('fs')

async function validateLocal() {
    let context = JSON.parse(await utils.loadData('C:\\Users\\anast\\Projects\\Schema\\shex-testing\\utils\\context.json'));
    let shexShapes = JSON.parse(await utils.loadData('C:\\Users\\anast\\Projects\\Schema\\shex-testing\\utils\\full.shexj'));

    let data = fs.readFileSync('C:\\Users\\anast\\Projects\\Schema\\shex-testing\\data\\0.json').toString();
    return (new ShexValidator(context, shexShapes)).validate(data, '');
}

async function validateGlobal() {
    let context = await utils.loadData('http://127.0.0.1:5000/context');
    let shexShapes = await utils.loadData('http://127.0.0.1:5000/shex/shapes');

    let data = fs.readFileSync('C:\\Users\\anast\\Projects\\Schema\\shex-testing\\data\\1.json').toString();
    return (new ShexValidator(context, shexShapes)).validate(data, '');
}

async function validateShaclLocal() {
    let context = JSON.parse(await utils.loadData('C:\\Users\\anast\\Projects\\Schema\\shex-testing\\utils\\context.json'));
    let shaclShapes = await utils.loadData('C:\\Users\\anast\\Projects\\Schema\\shex-testing\\utils\\fullfull.shacl');

    let subclasses = await utils.loadData('C:\\Users\\anast\\Projects\\Schema\\shex-testing\\utils\\subclasses.ttl');
    let validator = new ShaclValidator(shaclShapes, subclasses, context);

    let data = fs.readFileSync('C:\\Users\\anast\\Projects\\Schema\\shex-testing\\data\\1.json').toString();
    return validator.validate(data);
}

validateShaclLocal().then(res => console.log(res));