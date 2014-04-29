var instances = [];

function CliLoggerMock() {
  this.args = Array.prototype.slice.call(arguments);
  instances.push(this);
}

module.exports = CliLoggerMock;
module.exports.instances = instances;
