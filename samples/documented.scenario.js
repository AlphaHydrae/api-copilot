var Scenario = require('../lib').Scenario;

var scenario = new Scenario({
  name: 'Documented Scenario'
});

scenario.step('step', function() {});

scenario.on('scenario:info', function() {
  console.log('Additional Information:');
  console.log();
  console.log('  This scenario prints further documentation for the `info` sub-command.');
  console.log();
});

module.exports = scenario;
