var _ = require('underscore'),
    events = require('events'),
    util = require('util');

function ClientMock() {

  this.args = Array.prototype.slice.call(arguments);

  spyOn(this, 'configure');
  spyOn(this, 'request');

  events.EventEmitter.call(this);
}

util.inherits(ClientMock, events.EventEmitter);

_.extend(ClientMock.prototype, {

  configure: function(options) {
  },

  request: function() {
  }
});

module.exports = ClientMock;
