var _ = require('underscore'),
    h = require('./helpers'),
    path = require('path'),
    q = require('q');

function ScenarioFinderMock() {
  this.results = [];
  _.bindAll(this, 'finder');
  h.mockMethods(this, 'finder');
}

_.extend(ScenarioFinderMock.prototype, {

  finder: function() {
    if (!this.results.length) {
      throw new Error('No finder results mocked');
    }

    var result = this.results.shift();
    return result instanceof Error ? q.reject(result) : q(result);
  },

  addResults: function(files) {

    var result;
    if (files instanceof Error) {
      result = files;
    } else {
      result = parseFiles(files);
    }

    this.results.push(result);
    return result;
  }
});

function parseFiles(files) {
  return _.map(files, function(file) {
    return {
      file: file,
      name: path.basename(file).replace(/\.scenario\.js$/, '')
    };
  });
}

module.exports = ScenarioFinderMock;
module.exports.parseFiles = parseFiles;
