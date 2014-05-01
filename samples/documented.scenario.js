var Scenario = require('../lib').Scenario;

var scenario = new Scenario({
  name: 'Documented Scenario'
});

scenario.addParam('foo', { required: true, description: 'This is a required parameter.' });

scenario.addParam('bar', { required: false, pattern: /^https?:/, description: 'This should be an HTTP or HTTPS URL.' });

var myFlag = scenario.addParam('baz', { flag: true, description: 'Activate some feature with this flag.' })

myFlag.on('describe', function(print) {
  print('Listen to the `describe` event to add more documentation to parameters.');
  print('A print function is provided to correctly indent your text.');
});

scenario.step('step', function() {});

scenario.on('scenario:info', function() {
  console.log('This scenario prints further documentation for the `info` sub-command.');
  console.log();
});

module.exports = scenario;
