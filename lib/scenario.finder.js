var _ = require('underscore'),
    path = require('path'),
    q = require('q');

module.exports = function(glob) {

  function findScenarios(options) {
    if (!options || !options.source) {
      throw new Error('The `source` directory option is required to find API scenarios');
    }

    return q.nfcall(glob, path.join(options.source, '**', '*.scenario.js'));
  }

  function parseScenarios(files) {
    return _.map(files.sort(), function(file, i) {
      return {
        file: file,
        name: path.basename(file).replace(/\.scenario\.js$/, '')
      };
    });
  }

  return function(options) {
    return q.fcall(findScenarios, options).then(parseScenarios);
  };
};

module.exports['@require'] = [ 'glob' ];
