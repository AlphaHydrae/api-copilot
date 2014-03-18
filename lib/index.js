var _ = require('underscore'),
    colors = require('colors'),
    httpStatus = require('http-status'),
    request = require('request'),
    util = require('util');

// FIXME: make a pull request into http-status for this
httpStatus[422] = 'Unprocessable Entity';

function log(message, newLine) {
  process.stdout.write(message || '');
  if (newLine || typeof(newLine) == 'undefined') {
    process.stdout.write('\n');
  }
}

function Client(options) {
  this.baseUrl = options.baseUrl;
}

Client.prototype.request = function(options, callback) {
  if (!_.isObject(options)) {
    throw new Error('Request options must be an object');
  } else if (!options.method) {
    throw new Error('HTTP method missing');
  } else if (!options.url) {
    throw new Error('URL missing');
  }

  var requestOptions = _.clone(options);

  requestOptions.method = options.method.toUpperCase();
  requestOptions.url = this.buildUrl(options.url);

  var start = new Date().getTime();

  if (options.filters) {
    _.each(options.filters, function(filter) {
      filter(requestOptions);
    }, this);
  }

  log((requestOptions.method + ' ' + options.url).blue, false);

  request(requestOptions, _.bind(function(err, response, body) {

    var duration = new Date().getTime() - start;
    log(' - ' + (duration + 'ms').cyan, false);

    if (err) {
      log(' - ' + 'ERROR'.red + ' (' + err + ')');
      return callback(err);
    }

    if (response.statusCode >= 200 && response.statusCode <= 399) {
      log(' - ' + (response.statusCode + ' ' + httpStatus[response.statusCode]).green);
      this.logBody(response.body);
      callback(undefined, response);
    } else {
      log(' - ' + (response.statusCode + ' ' + httpStatus[response.statusCode]).yellow);
      this.logBody(response.body);
      callback(undefined, response);
    }
  }, this));
};

Client.prototype.logBody = function(body) {
  if (!body) {
    return;
  }

  log('Response body: ', false);

  if (_.isString(body)) {
    log(body);
  } else {
    log(JSON.stringify(body));
  }
};

Client.prototype.buildUrl = function(url) {
  return this.baseUrl ? this.baseUrl + url : url;
};

function Scenario(options) {
  options = _.extend({}, options);

  this.name = options.name;
  this.baseUrl = options.baseUrl
  this.defaultRequestOptions = options.defaultRequestOptions;

  this.store = {};
  this.operations = [];

  this.client = new Client(_.pick(options, 'baseUrl'));
  this.requestCount = 0;
  this.currentRequestCount = 0;
  this.requestFilters = [];
}

Scenario.prototype.step = function(name, operation) {
  this.operations.push({ name: name, operation: operation });
  return this;
};

Scenario.prototype.findStep = function(name, required) {

  var step = _.findWhere(this.operations, { name: name });
  if (!step && required) {
    throw new Error('Unknown step "' + name + '"');
  }

  return step;
};

Scenario.prototype.setNextStep = function(name, callback) {

  this.nextStep = name;

  if (callback) {
    if (typeof(callback) != 'function') {
      throw new Error('Second argument of #setNextStep or #goTo must be a function');
    }

    callback();
  }
};

Scenario.prototype.goTo = Scenario.prototype.setNextStep;

Scenario.prototype.run = function() {

  log();

  var title = 'Starting scenario';
  if (this.name) {
    title = '"' + this.name + '" scenario';
  }

  log(title.bold);

  log('Base URL: ' + this.baseUrl);

  this.stepNumber = 1;
  this.runRecursive(_.first(this.operations));
};

Scenario.prototype.runRecursive = function(op) {

  log();
  log(('STEP ' + this.stepNumber + ': ' + op.name).bold);
  this.stepNumber++;

  var callback = _.bind(function(err) {
    if (err) {
      return log(('ERROR: ' + err).red);
    } else if (!this.nextStep) {
      log();
      log('DONE!'.green);
      return log();
    }

    if (!this.currentRequestCount) {
      log('No HTTP request.');
    }
    this.currentRequestCount = 0;

    var nextStep = this.nextStep;
    delete this.nextStep;

    var args = Array.prototype.slice.call(arguments, 1);
    args.unshift(this.findStep(nextStep, true));

    this.runRecursive.apply(this, args);
  }, this);

  var opArgs = Array.prototype.slice.call(arguments, 1);
  opArgs.unshift(callback);

  op.operation.apply(this, opArgs);
};

Scenario.prototype.addRequestFilter = function(name, filter) {
  this.removeRequestFilters(name);
  this.requestFilters.push({ name: name, filter: _.bind(filter, undefined, this.store) });
};

Scenario.prototype.removeRequestFilters = function() {

  var names = Array.prototype.slice.call(arguments);
  if (!names.length) {
    this.requestFilters = [];
  }

  this.requestFilters = _.reject(this.requestFilters, function(filter) {
    return _.contains(names, filter.name);
  });
};

Scenario.prototype.setDefaultRequestOptions = function(options) {
  this.defaultRequestOptions = options;
};

Scenario.prototype.extendDefaultRequestOptions = function(options) {

  var newDefaultRequestOptions = _.extend({}, this.defaultRequestOptions, options);
  this.defaultRequestOptions = _.reduce(newDefaultRequestOptions, function(memo, value, key) {

    if (typeof(value) != 'undefined') {
      memo[key] = value;
    }

    return memo;
  }, {});
};

Scenario.prototype.clearDefaultRequestOptions = function() {

  var keys = Array.prototype.slice.call(arguments);
  if (!keys.length) {
    delete this.defaultRequestOptions;
  } else {
    _.each(keys, function(key) {
      delete this.defaultRequestOptions[key];
    }, this);
  }
};

_.each([ 'get', 'head', 'post', 'put', 'patch', 'delete' ], function(method) {

  Scenario.prototype[method] = function(options) {

    this.requestCount++;
    this.currentRequestCount++;

    options = _.extend({}, this.defaultRequestOptions, options, { method: method.toUpperCase() });
    options.filters = _.pluck(this.requestFilters, 'filter');

    this.client.request.apply(this.client, [ options ].concat(Array.prototype.slice.call(arguments, 1)));
  };
});

module.exports = {
  Scenario: Scenario
};
