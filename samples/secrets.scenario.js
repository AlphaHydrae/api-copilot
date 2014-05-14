var Scenario = require('../lib').Scenario;

var scenario = new Scenario({
  name: 'Scenario with Secret Parameters',
  summary: 'This scenario demonstrates obfuscation of secret parameters.',
  log: 'debug',
  params: {
    password: '1234',
    secret: '42',
    authToken: 'abcdefghijkl',
    clear: 'text'
  }
});

scenario.addParam('password', {
  description: 'User password.'
});

scenario.addParam('secret', {
  description: 'Secret phrase.'
});

scenario.addParam('authToken', {
  description: 'Authentication token.'
});

scenario.addParam('clear', {
  description: 'Non-secret parameter.'
});

scenario.step('step', function() {
});

module.exports = scenario;
