var _ = require('underscore');

function GlobMock() {
  this.reset();
}

_.extend(GlobMock.prototype, {

  sync: function(pattern, options) {
    return this.results[pattern] || [];
  },

  setResults: function(pattern, files) {
    this.results[pattern] = files;
  },

  reset: function() {
    this.results = {};
  }
});

var mock = new GlobMock();

module.exports = function(pattern, options, callback) {
  if (typeof(options) == 'function') {
    options = undefined;
    callback = options;
  }

  setTimeout(function() {
    callback(undefined, mock.sync(pattern, options));
  }, 1);
};

// TODO: export this mock as a class
_.each([ 'sync', 'setResults', 'reset' ], function(method) {
  module.exports[method] = _.bind(mock[method], mock);
});
