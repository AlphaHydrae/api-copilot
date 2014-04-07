var _ = require('underscore'),
    colors = require('colors'),
    events = require('events'),
    merge = require('deepmerge'),
    q = require('q'),
    slice = Array.prototype.slice,
    util = require('util');

exports.inject = function(deps) {

  deps = deps || {};
  var log4js = deps.log4js || require('log4js');

  var Client = deps.Client || require('./client').inject(),
      ScenarioClientExtensions = require('./scenario.client');

  function StepArgs(args) {
    this.args = args;
  }

  function Scenario(options) {
    if (!_.isObject(options)) {
      throw new Error('Options must be an object');
    } else if (!_.isString(options.name)) {
      throw new Error('"name" must be a string, got ' + options.name);
    }

    this.name = options.name;
    this.logger = log4js.getLogger(this.name);

    this.baseOptions = _.extend({}, options);

    this.params = this.baseOptions.params || {};
    this.requiredParameters = [];

    this.steps = [];

    this.client = new Client();
    this.requestFilters = [];

    _.each([ 'request', 'error', 'response' ], function(event) {
      this.client.on(event, _.bind(this.emit, this, 'client:' + event));
    }, this);

    events.EventEmitter.call(this);
    this.on('configure', _.bind(this.onConfigure, this));
    this.on('configure', _.bind(this.client.emit, this.client, 'configure'));
  }

  util.inherits(Scenario, events.EventEmitter);

  _.extend(Scenario.prototype, {

    defer: function() {
      return q.defer();
    },

    step: function(name, definition) {
      if (!_.isString(name)) {
        throw new Error('Step name must be a string, got ' + typeof(name));
      } else if (typeof(definition) != 'function') {
        throw new Error('Step definition must be a function, got ' + typeof(definition));
      } else if (this.findStep(name)) {
        throw new Error('Step "' + name + '" is already defined');
      }

      this.steps.push({ name: name, definition: definition });
      return this;
    },

    findStep: function(name) {
      return _.findWhere(this.steps, { name: name });
    },

    setNextStep: function(name) {

      this.nextStep = this.findStep(name);
      if (!this.nextStep) {
        throw new Error('No such step "' + name + '"');
      }
    },

    getNextStep: function() {

      var nextStep = this.nextStep;
      delete this.nextStep;

      return nextStep || this.steps[_.indexOf(this.steps, this.currentStep) + 1];
    },

    success: function() {
      return q(new StepArgs(slice.call(arguments)));
    },

    skip: function(message) {
      if (typeof(message) != 'undefined' && !_.isString(message)) {
        throw new Error('Skip message must be a string, got ' + typeof(message));
      }

      this.stepSkipped = message;

      return q(new StepArgs(slice.call(arguments, 1)));
    },

    fail: function(err) {
      return q.reject(err);
    },

    param: function(name, options) {
      options = _.extend({ required: true }, options);

      if (options.required && !_.has(this.params, name)) {
        throw new Error('Unknown parameter "' + name + '"; give it to the Scenario object at construction or from the command line with the -p, --params option');
      }

      return this.params[name];
    },

    requireParameters: function() {
      var args = slice.call(arguments);
      args.splice(0, 0, args.length, 0);
      this.requiredParameters.splice.apply(this.requiredParameters, args);
    },

    ensureParameters: function() {

      var missing = _.reject(this.requiredParameters, function(name) {
        return _.has(this.params, name);
      }, this);

      if (missing.length) {
        throw new Error('The following required parameters are missing: ' + missing.join(', '));
      }
    },

    run: function(options) {
      if (!this.steps.length) {
        throw new Error('No step defined');
      }

      var runOptions = merge(this.baseOptions, options || {});
      this.params = _.clone(runOptions.params || {});
      this.ensureParameters();

      if (runOptions.log) {
        this.logger.setLevel(runOptions.log.toUpperCase());
      }

      this.clearDefaultRequestOptions();
      this.configure(runOptions);
      this.emit('scenario:start', runOptions);

      var deferred = q.defer();
      this.runStep(_.first(this.steps), deferred);

      return deferred.promise;
    },

    configure: function(options) {
      this.emit('configure', options);
    },

    onConfigure: function(options) {
      options = options || {};

      if (_.has(options, 'baseUrl')) {
        this.baseUrl = options.baseUrl;
      }

      if (options.defaultRequestOptions) {
        this.setDefaultRequestOptions(options.defaultRequestOptions);
      }
    },

    runStep: function(step, deferred) {

      this.currentStep = step;
      delete this.stepSkipped;

      var description = { name: step.name },
          stepArgs = slice.call(arguments, 2);

      this.emit.apply(this, [ 'step:start', description ].concat(stepArgs));

      var stepResult = q.fapply(_.bind(step.definition, this), stepArgs);
      stepResult.then(_.bind(this.handleStepResult, this, deferred, description), _.bind(this.handleStepError, this, deferred, description));
    },

    handleStepResult: function(deferred, description) {

      var results = slice.call(arguments, 2);
      if (results.length == 1 && results[0] instanceof StepArgs) {
        results = results[0].args;
      }

      if (this.stepSkipped) {
        this.emit.apply(this, [ 'step:skip', description, this.stepSkipped ].concat(results));
      } else {
        this.emit.apply(this, [ 'step:done', description ].concat(results));
      }

      var nextStep = this.getNextStep();
      if (nextStep instanceof Error) {
        return this.handleStepError(deferred, description, nextStep);
      } else if (!nextStep) {
        this.emit('scenario:end');
        return deferred.resolve();
      }

      this.runStep.apply(this, [ nextStep, deferred ].concat(results));
    },

    handleStepError: function(deferred, description, err) {
      this.emit('step:error', description, err);
      this.emit('scenario:error', err);
      deferred.reject(err);
    }
  }, ScenarioClientExtensions);

  return Scenario;
};
