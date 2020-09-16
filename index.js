module.exports = {
    shexValidator: require('./shexValidator.js').Validator,
    shaclValidator: require('./shaclValidator.js').Validator,
    inputToQuads: require('./util.js').inputToQuads,
    randomUrl: require('./util.js').randomUrl,
    getType: require('./util.js').getType,
}