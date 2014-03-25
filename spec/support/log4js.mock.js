var LoggerMock = require('./logger.mock');

function Log4js() {
  this.loggers = {};
}

Log4js.prototype.getLogger = function(name) {

  if (!this.loggers[name]) {
    this.loggers[name] = new LoggerMock();
  }

  return this.loggers[name];
};

module.exports = new Log4js();
