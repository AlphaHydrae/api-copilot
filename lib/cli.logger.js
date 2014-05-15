var _ = require('underscore'),
    colors = require('colors'),
    httpStatus = require('http-status'),
    inflection = require('inflection'),
    url = require('url');

// **FIXME:** make a pull request into http-status for this
httpStatus[422] = 'Unprocessable Entity';

var EVENTS = {
  scenario: [ 'start', 'error', 'end' ],
  client: [ 'request', 'error', 'response' ],
  step: [ 'start', 'skip', 'error', 'done' ]
};

module.exports = function(log4js) {

  function Logger(scenario) {

    this.scenario = scenario;

    this.logger = log4js.getLogger(scenario.name);

    _.each(EVENTS, function(events, type) {

      var prefix = type + ':',
          methodPrefix = 'on' + inflection.capitalize(type);

      _.each(events, function(event) {
        scenario.on(prefix + event, _.bind(this[methodPrefix + inflection.capitalize(event)], this));
      }, this);
    }, this);

    scenario.on('configure', _.bind(this.configure, this));
  }

  _.extend(Logger.prototype, {

    configure: function(options) {

      _.extend(this, _.pick(options, 'baseUrl', 'showRequest', 'showResponseBody', 'showFullUrl'));

      this.configureLog4js(options);

      if (options.log) {
        this.logger.setLevel(options.log);
      }

      if (!this.configured) {
        console.log();
        this.logger.info(options.name.bold);
        console.log(); // FIXME: only if debug level
      }

      if (options.log) {
        if (this.configured && this.logger.level.toString() == options.log.toUpperCase()) {
          this.logger.debug('Log level set to ' + options.log);
        }
      }

      if (_.has(options, 'baseUrl')) {
        this.logger.debug('Base URL set to ' + options.baseUrl);
      }

      this.configured = true;
    },

    configureLog4js: function(options) {

      var logPattern = '';

      if (options.showTime) {
        logPattern += '%[[%d]%] ';
      }

      logPattern += '%m';

      log4js.configure({
        appenders: [
          {
            type: 'console',
            layout: {
              type: 'pattern',
              pattern: logPattern
            }
          }
        ]
      });
    },

    onScenarioStart: function(options) {

      this.stepNumber = 1;
      this.startTime = new Date().getTime();

      // TODO: check logger level once abstracted
      var params = options.params;
      if (_.isEmpty(params)) {
        this.logger.debug('Runtime parameters: none');
      } else {
        this.logger.debug('Runtime parameters:');
        _.each(_.keys(params).sort(), function(key) {
          this.logger.debug('  ' + key.underline + ' = ' + this.paramDisplayValue(key, params[key]));
        }, this);
      }
    },

    onScenarioError: function(err) {

      if (err instanceof Error && err.stack && this.logger.isLevelEnabled('trace')) {
        this.logger.trace(err.stack.red);
      } else {
        this.logger.error(err.toString().red);
      }

      console.log();
      this.logger.warn('Scenario terminated'.yellow);
      console.log();
    },

    onScenarioEnd: function() {

      var duration = new Date().getTime() - this.startTime;

      console.log();
      this.logger.info(('DONE in ' + (duration / 1000).toFixed(2) + 's' + '!').green);
      console.log(); 

      delete this.configured;
    },

    onStepStart: function(description) {

      this.stepStart = new Date().getTime();

      console.log();
      this.logger.info(('STEP ' + (this.stepNumber++) + ': ' + description.name).bold);
    },

    onStepSkip: function(description, message) {
      this.logger.info(('Skipped: ' + (message || 'no reason')).grey);
    },

    onStepError: function(description, err) {
      // nothing to do; handled by onScenarioError
    },

    onStepDone: function(description) {
      this.logger.info('Completed in ' + (new Date().getTime() - this.stepStart) + 'ms');
    },

    onClientRequest: function(requestNumber, requestOptions, originalOptions) {

      this.logRequest(requestNumber, requestOptions.method + ' ' + this.buildDisplayUrl(requestOptions.url));

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
    },

    buildDisplayUrl: function(urlString) {
      if (!this.baseUrl || this.showFullUrl) {
        return urlString;
      }

      try {
        var parsedUrl = url.parse(urlString);
        return parsedUrl.pathname ? parsedUrl.pathname : urlString;
      } catch (e) {
        return urlString;
      }
    },

    paramDisplayValue: function(key, value) {
      try {
        return JSON.stringify(this.scenario.getParameter(key).displayValue(value));
      } catch (e) {
        return value;
      }
    }
  });

  return Logger;
};

module.exports['@singleton'] = true;
module.exports['@require'] = [ 'log4js' ];
