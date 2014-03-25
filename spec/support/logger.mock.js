var _ = require('underscore');

var LEVELS = [ 'trace', 'debug', 'info', 'warn', 'error', 'fatal' ];

function LoggerMock() {

  this.totalCalls = 0;

  _.each(LEVELS, function(level) {
    spyOn(this, level).andCallThrough();
  }, this);
}

_.each(LEVELS, function(level) {
  LoggerMock.prototype[level] = function() {
    this.totalCalls++;
  };
});

module.exports = LoggerMock;
