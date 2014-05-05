var _ = require('underscore'),
    path = require('path');

module.exports = function() {

  return function(scenarios, options) {
    if (!_.isArray(scenarios)) {
      throw new Error('Expected an array of scenarios, got ' + typeof(scenarios));
    } else if (!options || !options.source) {
      throw new Error('The source directory option is required');
    }

    var listing = '';

    listing += 'Source directory: ' + path.resolve(options.source);
    listing += '\n  (use the `-s, --source <dir>` option to list API scenarios from another directory)';
    listing += '\n';

    if (!scenarios.length) {
      listing += '\n' + 'Available API scenarios: none'.yellow;
      listing += '\n';
      return listing;
    }

    var longestFilename = _.reduce(scenarios, function(memo, scenario) {
      return scenario.file.length > memo ? scenario.file.length : memo;
    }, 0);

    var known = {};

    listing += '\n' + ('Available API scenarios (' + scenarios.length + '):').bold;
    _.each(scenarios, function(scenario, i) {

      var name = scenario.name;
      listing += '\n' + (i + 1) + ') ';
      
      if (known[name]) {
        listing += scenario.file;
      } else {
        listing += pad(scenario.file, longestFilename + 3, ' ') + '(' + name + ')';
      }

      known[name] = true;
    });

    return listing;
  };

  function pad(string, width, padding) {
    return string.length >= width ? string : pad(string + padding, width, padding);
  }
};

module.exports['@require'] = [];
