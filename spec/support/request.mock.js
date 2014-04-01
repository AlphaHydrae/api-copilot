var _ = require('underscore');

function RequestMock() {
  this.callbackArgs = [];
  this.requestCount = 0;
}

_.extend(RequestMock.prototype, {

  addResponse: function(response) {
    this.callbackArgs.push([ undefined, response, response.body ]);
  },

  addError: function(err) {
    this.callbackArgs.push([ err ]);
  },

  func: function() {
    return _.bind(function(options, callback) {

      if (!this.callbackArgs.length) {
        throw new Error('No mock response registered for the current request; call #addResponse(responseObject) or #addError(error)');
      }

      this.requestCount++;
      this.lastRequestOptions = options;

      callback.apply(callback, this.callbackArgs.shift());
    }, this);
  }
});

module.exports = RequestMock;
