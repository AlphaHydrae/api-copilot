var _ = require('underscore'),
    merge = require('deepmerge'),
    q = require('q');

module.exports = function(deps) {

  deps = deps || {};
  var parameterFactory = deps.parameterFactory || require('./factory')(require('./parameter')()),
      print = deps.print || console.log;

  // ## Runtime Parameters Methods
  // Parameters can be passed as the `params` option to the constructor
  // or to the `#run` method. The latter will always override the former.
  return {

    addParam: function(name, options) {
      if (_.findWhere(this.parameters, { name: name })) {
        throw new Error('The parameter "' + name + '" is already defined');
      }

      var param = parameterFactory(name, options);
      this.parameters.push(param);

      return param;
    },

    // <a name="method-param"></a>
    // ### #param(name, options)
    // Returns the value of the parameter with the specified name.
    //
    //     var scenario = new Scenario({
    //       name: 'once upon a time',
    //       params: { foo: 'bar' }
    //     });
    //
    //     scenario.step('a step', function() {
    //       this.param('foo'); // "bar"
    //     });
    param: function(name) {
      if (!_.findWhere(this.parameters, { name: name })) {
        throw new Error('Unknown parameter "' + name + '"; add it to the Scenario object with the `addParam` method');
      }

      return this.parameterValues[name];
    },

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

      print();
      print('The scenario cannot be run because the following parameters are either missing or invalid:'.yellow);
      _.each(errors, function(error) {
        print('- ' + error);
      });

      print();
      print('You will now be asked for the missing or corrected values.'.green);
      print('Press Ctrl-C to quit.'.green);

      return this.fixInvalidParameters(invalidParameters);
    },

    fixInvalidParameters: function(invalidParameters) {

      var promise = q();
      _.each(invalidParameters, function(param) {
        promise = promise.then(_.bind(param.prompt, param)).then(_.bind(this.setFixedParameter, this, param));
      }, this);

      return promise.then(function() {
        print("\n");
      });
    },

    setFixedParameter: function(param, newValue) {
      this.parameterValues[param.name] = newValue;
      print(('Parameter ' + param.name.bold + ' set to:').green + ' ' + newValue);
    }
  };
};
