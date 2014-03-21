var _ = require('underscore');

var LEVELS = [ 'trace', 'debug', 'info', 'warn', 'error', 'fatal' ];

function LoggerMock() {

  this.count = 0;

  _.each(LEVELS, function(level) {
    spyOn(this, level);
  }, this);
}

_.each(LEVELS, function(level) {
  LoggerMock.prototype[level] = function() {
    this.count++;
  };
});

module.exports = LoggerMock;
