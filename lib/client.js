var _ = require('underscore'),
    colors = require('colors'),
    httpStatus = require('http-status'),
    q = require('q'),
    request = require('request');

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

_.extend(Client.prototype, {

  request: function(options) {
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

    var deferred = q.defer();

    request(requestOptions, _.bind(function(err, response, body) {

      var duration = new Date().getTime() - start;
      log(' - ' + (duration + 'ms').cyan, false);

      if (err) {
        log(' - ' + 'ERROR'.red + ' (' + err + ')');
        return deferred.reject(err);
      }

      if (response.statusCode >= 200 && response.statusCode <= 399) {
        log(' - ' + (response.statusCode + ' ' + httpStatus[response.statusCode]).green);
        this.logBody(response.body);
        deferred.resolve(response);
      } else {
        log(' - ' + (response.statusCode + ' ' + httpStatus[response.statusCode]).yellow);
        this.logBody(response.body);
        deferred.resolve(response);
      }
    }, this));

    return deferred.promise;
  },

  logBody: function(body) {
    if (!body) {
      return;
    }

    log('Response body: ', false);

    if (_.isString(body)) {
      log(body);
    } else {
      log(JSON.stringify(body));
    }
  },

  buildUrl: function(url) {
    return this.baseUrl ? this.baseUrl + url : url;
  }
});

module.exports = Client;
