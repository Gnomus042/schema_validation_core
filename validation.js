const shexValidator = require('./shexValidator.js');
const utils = require('./util.js');

class Validator {
    constructor(context, shexShapes) {
        this.context = context;
        this.shexShapes = shexShapes;
    }

    async validate(data, shape, service) {
        let baseUrl = utils.randomUrl();
        let quads = await utils.inputToQuads(data, baseUrl, this.context)
        return shexValidator.validate(quads, this.shexShapes, baseUrl, shape, service);
    }
}

module.exports = {
    Validator: Validator,
}