var _ = require('underscore');

function RequestMock() {
  this.results = [];
  this.requestCount = 0;
}

_.extend(RequestMock.prototype, {

  addResponse: function(response, options) {
    this.results.push(_.extend({}, options, { callbackArgs: [ undefined, response, response.body ] }));
  },

  addError: function(err, options) {
    this.results.push(_.extend({}, options, { callbackArgs: [ err ] }));
  },

  func: function() {
    return _.bind(function(options, callback) {

      if (!this.results.length) {
        throw new Error('No mock response registered for the current request; call #addResponse(responseObject) or #addError(error)');
      }

      this.requestCount++;
      this.lastRequestOptions = options;

      var result = this.results.shift();

      function completeRequest() {
        callback.apply(callback, result.callbackArgs);
      }


      if (result.delay) {
        setTimeout(completeRequest, result.delay);
      } else {
        completeRequest();
      }

      return { number: this.requestCount, options: options };
    }, this);
  }
});

module.exports = RequestMock;
