exports.inject = function(deps) {
  deps = deps || {};

  var _ = require('underscore'),
      httpStatus = require('http-status'),
      inflection = require('inflection'),
      log4js = deps.log4js || require('log4js');

  // FIXME: make a pull request into http-status for this
  httpStatus[422] = 'Unprocessable Entity';

  var EVENTS = {
    scenario: [ 'start', 'error', 'end' ],
    client: [ 'request', 'error', 'response' ],
    step: [ 'start', 'skip', 'error', 'done' ]
  };

  function Logger(scenario) {

    this.logger = log4js.getLogger(scenario.name);

    _.each(EVENTS, function(events, type) {

      var prefix = type + ':',
          methodPrefix = 'on' + inflection.capitalize(type);

      _.each(events, function(event) {
        scenario.on(prefix + event, _.bind(this[methodPrefix + inflection.capitalize(event)], this));
      }, this);
    }, this);
  }

  _.extend(Logger.prototype, {

    configure: function(options) {

      _.extend(this, _.pick(options, 'showRequest', 'showResponseBody'));

      if (options.log) {
        this.logger.setLevel(options.log);
      }
    },

    onScenarioStart: function(options) {
      this.configure(options);

      console.log();
      this.logger.info(options.name.bold);
      this.logger.info('Base URL: ' + options.baseUrl);
    },

    onScenarioError: function(err) {
      this.logger.error(err.toString().red);
      console.log();
      this.logger.warn('Scenario terminated'.yellow);
      console.log();
    },

    onScenarioEnd: function(duration) {
      console.log();
      this.logger.info((this.name + ' DONE in ' + (duration / 1000).toFixed(2) + 's' + '!').green);
      console.log(); 
    },

    onStepStart: function(name, number) {
      console.log();
      this.logger.info(('STEP ' + number + ': ' + name).bold);
    },

    onStepSkip: function(message) {
      this.logger.info(('Skipped: ' + (message || 'no reason')).grey);
    },

    onStepError: function(err) {
      // nothing to do; handled by onScenarioError
    },

    onStepDone: function(duration) {
      this.logger.info('Completed in ' + duration + 'ms');
    },

    onClientRequest: function(requestNumber, requestOptions, originalOptions) {

      this.logRequest(requestNumber, requestOptions.method + ' ' + originalOptions.url);

      if (this.showRequest) {
        this.logRequest(requestNumber, 'request options: ' + JSON.stringify(requestOptions).magenta);
      }
    },

    onClientError: function(requestNumber, error) {
      // nothing to do; handled by onScenarioError
    },

    onClientResponse: function(requestNumber, response, time) {

      var status = response.statusCode + ' ' + httpStatus[response.statusCode],
          statusColor = response.statusCode >= 200 && response.statusCode <= 399 ? 'green' : 'yellow';

      this.logRequest(requestNumber, status[statusColor] + ' in ' + time + 'ms');

      if (this.showResponseBody && response.body) {
        this.logRequest(requestNumber, 'response body: ' + (_.isString(response.body) ? response.body : JSON.stringify(response.body)).magenta);
      }
    },
    
    logRequest: function(requestNumber, message) {
      this.logger.debug(('http[' + requestNumber + ']').cyan + ' ' + message);
    }
  });

  return Logger;
};
