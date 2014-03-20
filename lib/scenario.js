var _ = require('underscore'),
    colors = require('colors'),
    q = require('q');

var Client = require('./client');

function log(message, newLine) {
  process.stdout.write(message || '');
  if (newLine || typeof(newLine) == 'undefined') {
    process.stdout.write('\n');
  }
}

function Scenario(options) {
  options = _.extend({}, options);

  this.name = options.name;
  this.baseUrl = options.baseUrl
  this.defaultRequestOptions = options.defaultRequestOptions;

  this.store = {};
  this.operations = [];

  this.client = new Client(_.pick(options, 'baseUrl'));
  this.requestCount = 0;
  this.requestFilters = [];
}

_.extend(Scenario.prototype, {

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
    deferred.resolve.apply(deferred, Array.prototype.slice.call(arguments, 1));
    return deferred.promise;
  },

  skip: function(message) {

    log(('Skipped: ' + (message || 'no reason')).grey);

    var deferred = q.defer();
    deferred.resolve.apply(deferred, Array.prototype.slice.call(arguments, 1));
    return deferred.promise;
  },

  fail: function(message) {

    log(('FAILED: ' + (message || 'no reason')).red);

    var deferred = q.defer();
    deferred.reject.apply(deferred, Array.prototype.slice.call(arguments, 1));
    return deferred.promise;
  },

  run: function() {

    log();

    var title = 'Starting scenario';
    if (this.name) {
      title = '"' + this.name + '" scenario';
    }

    log(title.bold);

    log('Base URL: ' + this.baseUrl);

    this.stepNumber = 1;
    this.runRecursive(_.first(this.operations));
  },

  runRecursive: function(op) {

    log();
    log(('STEP ' + this.stepNumber + ': ' + op.name).bold);
    this.stepNumber++;

    var errorCallback = function(err) {
      log(('ERROR: ' + err).red);
      process.exit(1);
    };

    var callback = _.bind(function() {

      var nextStep = this.getNextStep();
      if (!nextStep) {
        log();
        log('DONE!'.green);
        return log();
      }

      var args = Array.prototype.slice.call(arguments);
      args.unshift(nextStep);

      this.runRecursive.apply(this, args);
    }, this);

    this.currentStep = op;

    var opArgs = Array.prototype.slice.call(arguments, 1);

    var promise = op.operation.apply(this, opArgs)

    q.when(promise).then(callback, errorCallback);
  },

  addRequestFilter: function(name, filter) {
    this.removeRequestFilters(name);
    this.requestFilters.push({ name: name, filter: _.bind(filter, undefined, this.store) });
  },

  removeRequestFilters: function() {

    var names = Array.prototype.slice.call(arguments);
    if (!names.length) {
      this.requestFilters = [];
    }

    this.requestFilters = _.reject(this.requestFilters, function(filter) {
      return _.contains(names, filter.name);
    });
  },

  setDefaultRequestOptions: function(options) {
    this.defaultRequestOptions = options;
  },

  extendDefaultRequestOptions: function(options) {

    var newDefaultRequestOptions = _.extend({}, this.defaultRequestOptions, options);
    this.defaultRequestOptions = _.reduce(newDefaultRequestOptions, function(memo, value, key) {

      if (typeof(value) != 'undefined') {
        memo[key] = value;
      }

      return memo;
    }, {});
  },

  clearDefaultRequestOptions: function() {

    var keys = Array.prototype.slice.call(arguments);
    if (!keys.length) {
      delete this.defaultRequestOptions;
    } else {
      _.each(keys, function(key) {
        delete this.defaultRequestOptions[key];
      }, this);
    }
  },

  request: function(options) {

    this.requestCount++;

    options = _.extend({}, this.defaultRequestOptions, options);
    options.filters = _.pluck(this.requestFilters, 'filter');

    return this.client.request.apply(this.client, [ options ].concat(Array.prototype.slice.call(arguments, 1)));
  }
});

_.each([ 'get', 'head', 'post', 'put', 'patch', 'delete' ], function(method) {

  Scenario.prototype[method] = function(options) {
    options = _.extend({}, options, { method: method.toUpperCase() });
    return this.request.apply(this, [ options ].concat(Array.prototype.slice.call(arguments, 1)));
  };
});

module.exports = Scenario;
