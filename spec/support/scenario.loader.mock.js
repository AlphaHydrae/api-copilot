var _ = require('underscore'),
    h = require('./helpers'),
    q = require('q');

function ScenarioLoaderMock() {
  this.results = [];
  _.bindAll(this, 'loader');
  h.mockMethods(this, 'loader');
}

_.extend(ScenarioLoaderMock.prototype, {

  loader: function() {
    if (!this.results.length) {
      throw new Error('No loader results mocked');
    }

    var result = this.results.shift();
    return result instanceof Error ? q.reject(result) : q(result);
  },

  addResult: function(result) {
    this.results.push(result);
  }
});

module.exports = ScenarioLoaderMock;
