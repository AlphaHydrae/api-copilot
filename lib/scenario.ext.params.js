var _ = require('underscore'),
    merge = require('deepmerge'),
    q = require('q');

module.exports = function(parameterFactory, print) {

  return function(ScenarioPrototype) {

    ScenarioPrototype.initializers.push(function() {
      this.parameters = [];
      this.parameterLoaders = [];
      this.parameterValues = this.baseOptions.params || {};
    });

    ScenarioPrototype.beforeRun.push(function(runOptions) {
      return this.processParameters(runOptions);
    });

    // ## Runtime Parameters Methods
    // Parameters can be passed as the `params` option to the constructor
    // or to the `#run` method. The latter will always override the former.
    _.extend(ScenarioPrototype, {

      addParam: function(name, options) {
        if (!_.isString(name)) {
          throw new Error('Parameter name must be a string');
        } else if (_.findWhere(this.parameters, { name: name })) {
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
        return this.getParameterValue(name);
      },

      getParameter: function(name) {
        return _.findWhere(this.parameters, { name: name });
      },

      getParameterValue: function(name) {

        var parameter = this.getParameter(name);
        if (!parameter) {
          throw new Error('Unknown parameter "' + name + '"; add it to the Scenario object with the `addParam` method');
        }

        return this.parameterValues[name];
      },

      loadParametersWith: function(loader) {
        if (typeof(loader) !== 'function') {
          throw new Error('Parameter loader must be a function');
        }

        this.parameterLoaders.push(loader);
      },

      processParameters: function(runOptions) {
        return q.fcall(_.bind(this.loadParameters, this), runOptions).then(_.bind(this.ensureParameters, this));
      },

      loadParameters: function(runOptions) {

        var parameterValues = merge(this.baseOptions.params || {}, runOptions.params || {});

        var promise = q(parameterValues);

        _.each(this.parameterLoaders, function(loader, i) {
          promise = promise.then(loader).then(_.bind(this.ensureParameterValues, this, i));
        }, this);

        promise.then(_.bind(function(parameterValues) {
          this.parameterValues = parameterValues;
          return runOptions;
        }, this));

        return promise;
      },

      ensureParameterValues: function(loaderIndex, parameterValues) {
        if (parameterValues === undefined) {
          throw new Error('Parameter loading function at index ' + loaderIndex + ' returned nothing; it must return the updated runtime parameters');
        } else if (!_.isObject(parameterValues)) {
          throw new Error('Expected parameter loading function at index ' + loaderIndex + ' to return updated runtime parameters as an object, got ' + typeof(parameterValues));
        }

        return parameterValues;
      },

      ensureParameters: function(runOptions) {

        _.each(this.parameterValues, function(value, name) {
          this.param(name);
        }, this);

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
    });
  };
};

module.exports['@require'] = [ 'parameter.factory', 'cli.print' ];
