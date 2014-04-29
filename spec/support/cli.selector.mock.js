var _ = require('underscore'),
    h = require('./helpers'),
    q = require('q');

function CliSelectorMock() {
  this.results = [];
  _.bindAll(this, 'selector');
  h.mockMethods(this, 'selector');
}

_.extend(CliSelectorMock.prototype, {

  selector: function() {
    if (!this.results.length) {
      throw new Error('No CLI selector results mocked');
    }

    var result = this.results.shift();
    return result instanceof Error ? q.reject(result) : q(result);
  },

  addResult: function(result) {
    this.results.push(result);
  }
});

module.exports = CliSelectorMock;
