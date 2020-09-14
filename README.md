# Schema.org Content Checker CORE
NodeJs project for validating Sturctured Data with ShEx (SHACL coming soon). Is mainly used in a form of a bundle as a core part of the Schema.org Content Checker demo (https://www.gnomus042.com/). <br /><br />
**Main tasks:**
- parsing JSON-LS, Microdata, RDFa data using n3;
- validating structures data against ShEx shapes using a minified version of shex.js.

## Cli mode
To use this project as a cli, you need to:
1. ```npm install```
2. ```node cli --parse --input <file path>``` for parsing, ```node cli --validate --input <file path> --shex <path(url) to shex shapes>``` for validation. <br /><br />
**Additional arguments for parsing:** <br />
```--output <file path>``` - path to the output file. If not specified, output will be printed to the console. <br />
```-- format <format>``` - one of the output formats. Available formats: ```nquads|ntriples|turtle|trig```. 'nquads' is used by default. <br /><br />
**Additional arguments for validation:**<br />
```--output <file path>``` - path to the output file. If not specified, output will be printed to the console. <br />
