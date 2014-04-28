var Scenario = require('../lib').Scenario;

var scenario = new Scenario({
  name: 'Failed Scenario'
});

scenario.step('failed step', function() {
  throw new Error('bug');
});

module.exports = scenario;
