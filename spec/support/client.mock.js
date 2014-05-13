var _ = require('underscore'),
    events = require('events'),
    q = require('q'),
    util = require('util');

var RequestMock = require('./request.mock');

function ClientMock() {

  this.args = Array.prototype.slice.call(arguments);
  this.requestMock = new RequestMock();
  this.requestFunc = this.requestMock.func();
  this.requestNumber = 0;

  spyOn(this, 'configure');
  spyOn(this, 'request').andCallThrough();

  events.EventEmitter.call(this);
}

util.inherits(ClientMock, events.EventEmitter);

_.extend(ClientMock.prototype, {

  configure: function(options) {
  },

  request: function(options) {

    var number = ++this.requestNumber;
    this.emit('request', number, options);

    return q.nfcall(this.requestFunc, options).spread(_.bind(function(response, body) {
      this.emit('response', number, response);
      return response;
    }, this)).fail(_.bind(function(err) {
      this.emit('error', number, err);
      return q.reject(err);
    }, this));
  }
});

module.exports = ClientMock;
