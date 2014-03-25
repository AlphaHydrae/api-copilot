module.exports = {
  cli: require('./cli'),
  Scenario: require('./scenario').inject(),
  version: require('../package').version
};
