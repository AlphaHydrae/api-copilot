var Scenario = require('../lib').Scenario;

var scenario = new Scenario({
  name: 'Minimal Scenario'
});

scenario.step('step', function() {});

module.exports = scenario;
