
// # API Copilot
// Write testing or data population scenarios for your APIs.

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
