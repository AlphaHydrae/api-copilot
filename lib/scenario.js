exports.inject = function(deps) {
  deps = deps || {};

  var _ = require('underscore'),
      colors = require('colors'),
      log4js = deps.log4js || require('log4js'),
      q = require('q');

  var Client = deps.Client || require('./client').inject(),
      ScenarioClientExtensions = require('./scenarioClient');

  function StepArgs(args) {
    this.args = args;
  }

  function Scenario(options) {

    this.store = {};
    this.steps = [];
    this.configure(options);

    this.logger = log4js.getLogger(this.name);

    this.client = new Client(_.extend({}, options, { logger: this.logger }));
    this.requestFilters = [];
  }

  _.extend(Scenario.prototype, {

    configure: function(options) {
      _.extend(this, _.pick(options, 'name', 'baseUrl', 'defaultRequestOptions'));
    },

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

      this.stepSkipped = true;
      this.logger.info(('Skipped: ' + (message || 'no reason')).grey);

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

      this.configure(options);
      this.client.configure(options);

      var title = 'Starting scenario';
      if (this.name) {
        title = '"' + this.name + '" scenario';
      }

      console.log();
      this.logger.info(title.bold);
      this.logger.info('Base URL: ' + this.baseUrl);

      this.stepNumber = 1;
      this.runRecursive(_.first(this.steps), deferred);

      return deferred.promise;
    },

    runRecursive: function(op, deferred) {

      console.log();
      this.logger.info(('STEP ' + this.stepNumber + ': ' + op.name).bold);
      this.stepNumber++;

      var errorCallback = function(err) {
        this.logger.error.apply(this.logger, [ err.toString().red ].concat(Array.prototype.slice.call(arguments, 1)));
        console.log();
        this.logger.warn('Scenario terminated');
        console.log();
        deferred.reject(err);
        process.exit(1);
      };

      var callback = function(startTime) {

        if (!this.stepSkipped) {
          this.logger.info('Completed in ' + (new Date().getTime() - startTime) + 'ms');
        }

        var nextStep = this.getNextStep();
        if (!nextStep) {
          console.log();
          this.logger.info((this.name + ' DONE in ' + this.getHumanDuration() + '!').green);
          console.log();
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
    },

    getHumanDuration: function() {
      return ((new Date().getTime() - this.startTime) / 1000).toFixed(2) + 's';
    }
  }, ScenarioClientExtensions);

  return Scenario;
};
