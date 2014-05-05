var factory = require('./factory');

module.exports = function(Parameter) {
  return factory(Parameter);
};

module.exports['@require'] = [ 'parameter' ];
