module.exports = function(file) {

  var scenario = require(file);

  if (!(scenario instanceof require('./index').Scenario)) {
    throw new Error(file + ' does not export a valid API scenario');
  }

  return scenario;
};
