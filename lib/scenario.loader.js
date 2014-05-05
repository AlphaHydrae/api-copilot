module.exports = function(Scenario) {

  return function(file) {

    var scenario = require(file);

    if (!(scenario instanceof Scenario)) {
      throw new Error(file + ' does not export a valid API scenario');
    }

    return scenario;
  };
};

module.exports['@require'] = [ 'scenario' ];
