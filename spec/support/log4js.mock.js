var LoggerMock = require('./logger.mock');

function Log4js() {
  this.reset();
}

Log4js.prototype.getLogger = function(name) {

  if (!this.loggers[name]) {
    this.loggers[name] = new LoggerMock();
  }

  return this.loggers[name];
};

Log4js.prototype.reset = function() {
  this.loggers = {};
};

module.exports = new Log4js();
