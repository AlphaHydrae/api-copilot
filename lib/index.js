// # API Copilot
// Write testing or data population scenarios for your APIs.
//
// This tool provides a pattern to run sequential asynchronous steps while
// avoiding callbacks with the use of [promises](http://promises-aplus.github.io/promises-spec/).
// It also includes a promise-based HTTP client based on the [request](https://github.com/mikeal/request) library.
// Promises are provided by the [q](https://github.com/kriskowal/q) library.
var ioc = require('./ioc');

// ## Components
//
// * [scenario.js](scenario.js.html) - the class used to define data population or testing scenarios;
// * [scenario.client.js](scenario.client.js.html) - scenario extensions to make HTTP calls;
// * [client.js](client.js.html) - a promise-based HTTP client around the [request](https://github.com/mikeal/request) library.
// * [cli.logger.js](cli.logger.js.html) - a command line logger that listens to scenario events;
// * [cli.command.js](cli.command.js.html) - class responsible for parsing the configuration file and command line options;
// * [cli.js](cli.js.html) - function that runs API Copilot in the current working directory.

// ## Exports
// When requiring `api-copilot`, the following things are provided:
//
// * `Scenario` - the class used to define scenarios (see [scenario.js](scenario.js.html));
// * `cli` - a function that runs API Copilot in the current working directory;
//
//     var copilot = require('api-copilot');
//     copilot.cli(process.argv)
// * `version` - the semantic version string (e.g. `1.2.3`).
module.exports = {
  Scenario: require('./scenario')(),
  cli: require('./cli'),
  version: require('../package').version
};
