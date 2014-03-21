var _ = require('underscore'),
    colors = require('colors'),
    log4js = require('log4js'),
    q = require('q');

var Client = require('./client').inject(),
    ScenarioClientExtensions = require('./scenarioClient');

function Scenario(options) {

  this.store = {};
  this.operations = [];
  this.configure(options);

  this.logger = log4js.getLogger(this.name);

  this.client = new Client(_.extend({}, options, { logger: this.logger }));
  this.requestCount = 0;
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
    this.operations.push({ name: name, operation: operation });
    return this;
  },

  findStep: function(name, required) {

    var step = _.findWhere(this.operations, { name: name });
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

      var i = _.indexOf(this.operations, this.currentStep);
      if (i < this.operations.length - 1) {
        step = this.operations[i + 1];
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
    deferred.resolve.apply(deferred, Array.prototype.slice.call(arguments));
    return deferred.promise;
  },

  skip: function(message) {

    this.stepSkipped = true;
    this.logger.info(('Skipped: ' + (message || 'no reason')).grey);

    var deferred = q.defer();
    deferred.resolve.apply(deferred, Array.prototype.slice.call(arguments, 1));
    return deferred.promise;
  },

  fail: function() {
    var deferred = q.defer();
    deferred.reject.apply(deferred, Array.prototype.slice.call(arguments));
    return deferred.promise;
  },

  run: function(options) {

    this.startTime = new Date().getTime();
    this.logger.setLevel(options.log.toUpperCase());

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
    this.runRecursive(_.first(this.operations));
  },

  runRecursive: function(op) {

    console.log();
    this.logger.info(('STEP ' + this.stepNumber + ': ' + op.name).bold);
    this.stepNumber++;

    var errorCallback = function(err) {
      this.logger.error.apply(this.logger, [ err.toString().red ].concat(Array.prototype.slice.call(arguments, 1)));
      console.log();
      this.logger.warn('Scenario terminated');
      console.log();
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
        return console.log();
      }

      var args = Array.prototype.slice.call(arguments, 1);
      args.unshift(nextStep);

      this.runRecursive.apply(this, args);
    };

    this.currentStep = op;
    delete this.stepSkipped;

    var startTime = new Date().getTime();
    q.when(op.operation.apply(this, Array.prototype.slice.call(arguments, 1))).then(_.bind(callback, this, startTime), _.bind(errorCallback, this));
  },

  getHumanDuration: function() {
    return ((new Date().getTime() - this.startTime) / 1000).toFixed(2) + 's';
  }
}, ScenarioClientExtensions);

module.exports = Scenario;
