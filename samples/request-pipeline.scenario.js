var _ = require('underscore'),
    copilot = require('../lib'),
    q = require('q');

var scenario = new copilot.Scenario({
  name: 'HTTP Request Pipeline Sample',
  summary: 'Demonstrate configuration of the request pipeline to run one HTTP request at a time with no parallelism.',
  log: 'debug',
  requestPipeline: 1,
  requestCooldown: 250
});

scenario.step('make 10 HTTP requests', function() {

  var requests = [];
  _.times(10, function() {
    requests.push(this.get({ url: 'http://google.com' }));
  }, this);

  return q.all(requests);
});

scenario.step('check that all responses were received', function(responses) {
  console.log(responses.length + ' responses were received');
});

module.exports = scenario;
