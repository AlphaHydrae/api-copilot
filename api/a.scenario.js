var Scenario = require('../lib').Scenario;

var scenario = new Scenario({
  name: 'Sample Scenario A'
});

scenario.step('step 1', function() {});

scenario.step('step 2', function() {});

module.exports = scenario;
