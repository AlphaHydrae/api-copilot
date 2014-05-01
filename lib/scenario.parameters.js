var _ = require('underscore'),
    merge = require('deepmerge'),
    q = require('q');

module.exports = {

  ensureParameters: function(runOptions) {

    // Required parameters are checked before starting to run.
    this.parameterValues = merge(this.parameterValues, runOptions.params || {});

    var invalidParameters = [];

    var errors = _.reduce(this.parameters, function(memo, param) {
      if (!param.validate(this.parameterValues[param.name], memo)) {
        invalidParameters.push(param);
      }
      return memo;
    }, [], this);

    if (!errors.length) {
      return q();
    }

    console.log();
    console.log('The scenario cannot be run because the following parameters are either missing or invalid:'.yellow);
    _.each(errors, function(error) {
      console.log('- ' + error);
    });

    console.log();
    console.log('You will now be asked for the missing or corrected values.'.green);
    console.log('Press Ctrl-C to quit.'.green);

    return this.fixInvalidParameters(invalidParameters);
  },

  fixInvalidParameters: function(invalidParameters) {

    var promise = q();
    _.each(invalidParameters, function(param) {
      promise = promise.then(_.bind(param.prompt, param)).then(_.bind(this.setFixedParameter, this, param));
    }, this);

    return promise;
  },

  setFixedParameter: function(param, newValue) {
    this.parameterValues[param.name] = newValue;
    console.log(('Parameter ' + param.name.bold + ' set to:').green + ' ' + newValue);
  }
};
