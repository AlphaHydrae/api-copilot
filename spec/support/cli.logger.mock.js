function CliLoggerMock() {
  this.args = Array.prototype.slice.call(arguments);
}

module.exports = CliLoggerMock;
