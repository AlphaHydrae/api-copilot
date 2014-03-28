exports.inject = function(deps) {
  deps = deps || {};

  var _ = require('underscore'),
      colors = require('colors'),
      events = require('events'),
      log4js = deps.log4js || require('log4js'),
      q = require('q'),
      util = require('util');

  var Client = deps.Client || require('./client').inject(),
      ScenarioClientExtensions = require('./scenarioClient');

  function fulfill(value) {
    var deferred = q.defer();
    deferred.resolve(value);
    return deferred.promise;
  }

  function reject(err) {
    var deferred = q.defer();
    deferred.reject(err);
    return deferred.promise;
  }

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

    this.steps = [];

    this.client = new Client();
    this.requestFilters = [];

    _.each([ 'request', 'error', 'response' ], function(event) {
      this.client.on(event, _.bind(this.emit, this, 'client:' + event));
    }, this);

    events.EventEmitter.call(this);
  }

  util.inherits(Scenario, events.EventEmitter);

  _.extend(Scenario.prototype, {

    defer: function() {
      return q.defer();
    },

    step: function(name, operation) {
      this.steps.push({ name: name, operation: operation });
      return this;
    },

    findStep: function(name) {
      return _.findWhere(this.steps, { name: name });
    },

    setNextStep: function(name) {
      this.nextStep = name;
    },

    getNextStep: function() {

      var nextStep = this.nextStep;
      delete this.nextStep;

      var step;

      if (!nextStep) {

        var i = _.indexOf(this.steps, this.currentStep);
        if (i < this.steps.length - 1) {
          step = this.steps[i + 1];
        } else {
          return;
        }
      }

      return step || this.findStep(nextStep) || new Error('No such step defined: "' + nextStep + '"');
    },

    success: function() {
      return fulfill(new StepArgs(Array.prototype.slice.call(arguments)));
    },

    skip: function(message) {
      if (typeof(message) != 'undefined' && !_.isString(message)) {
        throw new Error('Skip message must be a string, got ' + typeof(message));
      }

      this.stepSkipped = message;

      return fulfill(new StepArgs(Array.prototype.slice.call(arguments, 1)));
    },

    fail: function(err) {
      return reject(err);
    },

    run: function(options) {
      if (!this.steps.length) {
        throw new Error('No step defined');
      }

      var deferred = q.defer();
      options = _.extend({}, options);

      if (options.log) {
        this.logger.setLevel(options.log.toUpperCase());
      }

      var runOptions = _.extend({}, this.baseOptions, options);

      this.clearDefaultRequestOptions();
      if (runOptions.defaultRequestOptions) {
        this.extendDefaultRequestOptions(runOptions.defaultRequestOptions);
      }

      this.emit('scenario:start', runOptions);
      this.client.configure(runOptions);

      this.runRecursive(_.first(this.steps), deferred);

      return deferred.promise;
    },

    runRecursive: function(op, deferred) {

      var description = { name: op.name };

      var errorCallback = function(err) {
        this.emit('step:error', description, err);
        this.emit('scenario:error', err);
        deferred.reject(err);
      };

      var callback = function() {

        var args = Array.prototype.slice.call(arguments);
        if (args.length == 1 && args[0] instanceof StepArgs) {
          args = args[0].args;
        }

        if (this.stepSkipped) {
          this.emit.apply(this, [ 'step:skip', description, this.stepSkipped ].concat(args));
        } else {
          this.emit.apply(this, [ 'step:done', description ].concat(args));
        }

        var nextStep = this.getNextStep();
        if (nextStep instanceof Error) {
          errorCallback.call(this, nextStep);
        } else if (!nextStep) {
          this.emit('scenario:end');
          return deferred.resolve();
        }

        args.unshift(deferred);
        args.unshift(nextStep);

        this.runRecursive.apply(this, args);
      };

      this.currentStep = op;
      delete this.stepSkipped;

      var stepArgs = Array.prototype.slice.call(arguments, 2);
      this.emit.apply(this, [ 'step:start', description ].concat(stepArgs));

      q.when(op.operation.apply(this, stepArgs), _.bind(callback, this), _.bind(errorCallback, this));
    }
  }, ScenarioClientExtensions);

  return Scenario;
};
