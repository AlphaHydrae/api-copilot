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

    this.store = {};
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

    findStep: function(name, required) {

      var step = _.findWhere(this.steps, { name: name });
      if (!step && required) {
        throw new Error('Unknown step "' + name + '"');
      }

      return step;
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
          return false;
        }
      }

      if (!step) {
        step = this.findStep(nextStep, true);
      }

      return step;
    },

    success: function() {
      var deferred = q.defer();
      deferred.resolve(new StepArgs(Array.prototype.slice.call(arguments)));
      return deferred.promise;
    },

    skip: function(message) {

      this.stepSkipped = message;

      var deferred = q.defer();
      deferred.resolve(new StepArgs(Array.prototype.slice.call(arguments, 1)));
      return deferred.promise;
    },

    fail: function(err) {
      var deferred = q.defer();
      deferred.reject(err);
      return deferred.promise;
    },

    run: function(options) {
      if (!this.steps.length) {
        throw new Error('No step defined');
      }

      var deferred = q.defer();
      options = _.extend({}, options);

      this.startTime = new Date().getTime();

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

      this.stepNumber = 1;
      this.runRecursive(_.first(this.steps), deferred);

      return deferred.promise;
    },

    runRecursive: function(op, deferred) {

      this.emit('step:start', op.name, this.stepNumber);
      this.stepNumber++;

      var errorCallback = function(err) {
        this.emit('scenario:error', err);
        deferred.reject(err);
        process.exit(2);
      };

      var callback = function(startTime) {

        if (this.stepSkipped) {
          this.emit('step:skip', this.stepSkipped);
        } else {
          this.emit('step:done', new Date().getTime() - startTime);
        }

        var nextStep = this.getNextStep();
        if (!nextStep) {
          this.emit('scenario:end', new Date().getTime() - this.startTime);
          return deferred.resolve();
        }

        var args = Array.prototype.slice.call(arguments, 1);
        args.unshift(deferred);
        args.unshift(nextStep);

        this.runRecursive.apply(this, args);
      };

      this.currentStep = op;
      delete this.stepSkipped;

      var stepArgs = Array.prototype.slice.call(arguments, 2);
      if (stepArgs.length == 1 && stepArgs[0] instanceof StepArgs) {
        stepArgs = stepArgs[0].args;
      }

      var startTime = new Date().getTime();
      q.when(op.operation.apply(this, stepArgs)).then(_.bind(callback, this, startTime), _.bind(errorCallback, this));
    }
  }, ScenarioClientExtensions);

  return Scenario;
};
