var _ = require('underscore'),
    events = require('events'),
    q = require('q'),
    util = require('util');

var RequestMock = require('./request.mock');

function ClientMock() {

  this.args = Array.prototype.slice.call(arguments);
  this.requestMock = new RequestMock();
  this.requestFunc = this.requestMock.func();

  spyOn(this, 'configure');
  spyOn(this, 'request').andCallThrough();

  events.EventEmitter.call(this);
}

util.inherits(ClientMock, events.EventEmitter);

_.extend(ClientMock.prototype, {

  configure: function(options) {
  },

  request: function(options) {
    return q.nfcall(this.requestFunc, options).spread(function(response, body) {
      return response;
    });
  }
});

module.exports = ClientMock;
