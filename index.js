module.exports = {
    shexValidator: require('./shexValidator.js').Validator,
    shaclValidator: require('./shaclValidator.js').Validator,
    inputToQuads: require('./util').inputToQuads,
    parseJsonLd: require('./util').parseJsonLd,
    parseMicrodata: require('./util').parseMicrodata,
    parseRdfa: require('./util').parseRdfa,
    parseTurtle: require('./util').parseTurtle,
    randomUrl: require('./util').randomUrl
}