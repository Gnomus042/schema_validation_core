'use strict';

const fs = require('fs');
const axios = require('axios');

const jsonld = require('jsonld');
const n3 = require('n3');
const { namedNode, blankNode, variable, literal, defaultGraph, quad } = n3.DataFactory;
const Store = n3.Store;
const streamify = require('streamify-string');
const RdfaParser = require('rdfa-streaming-parser').RdfaParser;
const microdata = require('microdata-node');

const errors = require('./errors');

const TYPE = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type';

/**
 * Loads related data (shapes, context, etc.) from remote or local source
 * @param {string} link url to the remote source or local path
 * @return {*}
 */
async function loadData(link) {
    if (link.match("^https?://")) {
        return (await axios.get(link)).data;
    }
    return fs.readFileSync(link).toString();
}

/**
 * Removes duplicates from objects array
 * @param {[object]} items
 * @param {[string]} keys
 * @returns {[object]}
 */
function uniqueBy(items, keys) {
    let seen = {};
    return items.filter(function (item) {
        let val = '';
        keys.forEach(key => val += item[key]);
        return seen.hasOwnProperty(val) ? false : (seen[val] = true);
    })
}

/**
 *  Generates random URL as base
 *  @param {number} length
 *  @return {string}
 */
function randomUrl(length = 16) {
    let result = 'https://example.org/';
    let characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
}

/**
 * Parses json-ld to quads into the n3.Store
 * @param {string} text input data
 * @param {string} baseUrl
 * @param {object} context schema.org context
 * @return {Promise<Store>}
 */
async function parseJsonLd(text, baseUrl, context) {
    let data = JSON.parse(text);
    data['@id'] = baseUrl;
    data['@context'] = context;
    const nquads = await jsonld.toRDF(data, {format: 'application/n-quads'});
    const turtleParser = new n3.Parser({
        format: "text/turtle",
        baseIRI: baseUrl,
    });
    let store = new Store();
    turtleParser.parse(nquads).forEach(quad => {
        store.addQuad(quad);
    });
    return store;
}


/**
 * Parse RDFa to quads into the n3.Store
 * @param {string} text input data
 * @param {string} baseUrl
 * @return {Promise<Store>}
 */
async function parseRdfa(text, baseUrl) {
    const textStream = streamify(text);
    return new Promise((res, rej) => {
        let store = new Store();
        const rdfaParser = new RdfaParser({ baseIRI: baseUrl, contentType: 'text/html' });
        textStream.pipe(rdfaParser)
            .on('data', quad => {
                quad.object.value = quad.object.value.replace('https://schema.org/', 'http://schema.org/');
                quad.predicate.value = quad.predicate.value.replace('https://schema.org/', 'http://schema.org/');
                quad.subject.value = quad.subject.value.replace('https://schema.org/', 'http://schema.org/');
                store.addQuad(quad);
            })
            .on('error', err => rej(err))
            .on('end', () => res(store));
    });
}

/**
 * Parses microdata subject, predicate or object to quadable format
 * TODO review if these format transformations could be done in the library; needs testing
 * @param {string|object} val
 * @param {string} baseURL
 * @return {Literal|BlankNode|NamedNode}
 */
function parseMicrodataValue(val, baseURL) {
    if (typeof val === "string") {
        if (val.match("^https?://")) {
            val = val.replace("https://schema.org/", "http://schema.org/") // TODO remove substitution of https by http
            return namedNode(val);
        } else if (val.match("^_:")) {
            if (val === "_:0") return namedNode(baseURL);
            return blankNode(val.substr(2));
        } else {
            return literal(val);
        }
    }
    if ('id' in val) {
        return namedNode(val.id.replace("https://schema.org/", "http://schema.org/")) // TODO remove substitution of https by http
    } if ('value' in val) {
        return literal(val.value);
    }
    throw `Unknown value during the microdata triples parsing: ${JSON.stringify(val)}`;
}

/**
 * Parses microdata triples to n3 quads
 * @param triple - microdata triple
 * @baseUrl {string}
 * @graph {*}
 * @return {Quad}
 */
function microdataTripleToQuad(triple, baseUrl, graph) {
    let subject = parseMicrodataValue(triple.subject, baseUrl);
    let predicate = parseMicrodataValue(triple.predicate, baseUrl);
    let object = parseMicrodataValue(triple.object, baseUrl);
    return quad(subject, predicate, object, graph);
}

/**
 * Parses microdata to quads into the n3.Store
 * @param {string} text
 * @param {string} baseUrl
 * @return {Promise<Store>}
 */
async function parseMicrodata(text, baseUrl) {
    let triples = microdata.toRdf(text, {base: baseUrl});
    if (text.length > 0 && triples.length === 0) {
        throw "Microdata parsing error";
    }
    let store = new Store();
    let graph = defaultGraph();
    triples.forEach(triple => store.addQuad(microdataTripleToQuad(triple, baseUrl, graph)));
    return store;
}


/**
 *
 */
function parseTurtle(text) {
    const turtleParser = new n3.Parser({
        format: "text/turtle"
    });
    let store = new Store();
    turtleParser.parse(text).forEach(quad => {
        store.addQuad(quad);
    });
    return store;
}

/**
 * Helper for trying to parse input text into a certain format
 * @param parser parser function
 * @returns {Promise<undefined|Store>}
 */
async function tryParse(parser) {
    let quads;
    try {
        quads = await parser();
    } catch (e) {}
    return quads;
}

/**
 * Transforms input to quads
 * @param text - input data
 * @param baseUrl
 * @param context - Schema.org context for json-ld
 * @returns {Promise<Store>}
 */
async function inputToQuads(text, baseUrl, context) {
    const jsonParser = async () => await parseJsonLd(text, baseUrl, context);
    const rdfaParser = async () => await parseRdfa(text, baseUrl);
    const microdataParser = async () => await parseMicrodata(text, baseUrl);
    let res = await tryParse(jsonParser) || await tryParse(microdataParser) || await tryParse(rdfaParser);
    if (!res || res.getQuads().length === 0) throw new errors.InvalidDataError("Error while parsing the data. This could be caused by incorrect data or incorrect data format. Possible formats: json-ld, microdata, rdfa");
    return res;
}

/**
 * @param {Store} quads
 * @param {string} baseUrl
 * @returns {string}
 */
function getType(quads, baseUrl) {
    let typeQuads = quads.getQuads(baseUrl, TYPE, undefined);
    if (typeQuads.length === 0) throw new errors.InvalidDataError("Data is required to have a type field ");
    return typeQuads[0].object.value.replace(this.schemaUrl, '');
}

module.exports = {
    randomUrl: randomUrl,
    loadData: loadData,
    uniqueBy: uniqueBy,
    getType: getType,
    inputToQuads: inputToQuads,
    parseTurtle: parseTurtle,
};