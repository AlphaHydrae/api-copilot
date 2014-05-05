module.exports = function(clientExtensions, parameterExtensions) {
  return [ clientExtensions, parameterExtensions ];
};

module.exports['@require'] = [ 'scenario.ext.client', 'scenario.ext.params' ];
