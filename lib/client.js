var _ = require('underscore'),
    colors = require('colors'),
    httpStatus = require('http-status'),
    log4js = require('log4js'),
    q = require('q'),
    request = require('request');

// FIXME: make a pull request into http-status for this
httpStatus[422] = 'Unprocessable Entity';

function Client(options) {
  this.requestNumber = 0;
  this.configure(options);
}

_.extend(Client.prototype, {

  configure: function(options) {
    _.extend(this, _.pick(options, 'baseUrl', 'showRequest', 'showResponseBody', 'logger'));
  },

  request: function(options) {
    if (!_.isObject(options)) {
      throw new Error('Request options must be an object');
    } else if (!options.method) {
      throw new Error('HTTP method missing');
    } else if (!options.url) {
      throw new Error('URL missing');
    }

    var requestNumber = ++this.requestNumber,
        requestOptions = _.clone(options);

    requestOptions.method = options.method.toUpperCase();
    requestOptions.url = this.buildUrl(options.url);

    if (options.filters) {
      _.each(options.filters, function(filter) {
        filter(requestOptions);
      }, this);
    }

    this.logHttp('debug', requestNumber, requestOptions.method + ' ' + options.url);
    this.logRequest(_.omit(requestOptions, 'filters'), requestNumber);

    var deferred = q.defer(),
        startTime = new Date().getTime();

    request(requestOptions, _.bind(function(err, response, body) {
      if (err) {
        return deferred.reject(err);
      }

      this.logResponse(response, startTime, requestNumber);

      deferred.resolve(response);
    }, this));

    return deferred.promise;
  },

  logHttp: function(level, requestNumber, message) {
    this.logger[level](('http[' + requestNumber + ']').cyan + ' ' + message);
  },

  logRequest: function(options, requestNumber) {
    if (this.showRequest) {
      this.logHttp('debug', requestNumber, 'request options: ' + JSON.stringify(options).magenta);
    }
  },

  logResponse: function(response, startTime, requestNumber) {
    
    var duration = new Date().getTime() - startTime,
        status = response.statusCode + ' ' + httpStatus[response.statusCode],
        statusColor = response.statusCode >= 200 && response.statusCode <= 399 ? 'green' : 'yellow';

    this.logHttp('debug', requestNumber, status[statusColor] + ' in ' + duration + 'ms');

    if (this.showResponseBody && response.body) {
      this.logHttp('debug', requestNumber, 'response body: ' + (_.isString(response.body) ? response.body : JSON.stringify(response.body)).magenta);
    }
  },

  buildUrl: function(url) {
    return this.baseUrl ? this.baseUrl + url : url;
  }
});

module.exports = Client;
