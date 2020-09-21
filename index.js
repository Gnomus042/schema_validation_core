/**
 * Copyright 2020 Anastasiia Byvsheva & Dan Brickley
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
module.exports = {
    shexValidator: require('./shexValidator').Validator,
    shaclValidator: require('./shaclValidator').Validator,
    inputToQuads: require('./util').inputToQuads,
    parseJsonLd: require('./util').parseJsonLd,
    parseMicrodata: require('./util').parseMicrodata,
    parseRdfa: require('./util').parseRdfa,
    parseTurtle: require('./util').parseTurtle,
    randomUrl: require('./util').randomUrl
}