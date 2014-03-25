var _ = require('underscore');

RegExp.escape = function(s) {
  return s.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
};

describe("CLI Logger", function() {

  var log4jsMock = require('./support/log4js.mock'),
      ScenarioMock = require('./support/scenario.mock'),
      cliLoggerInjector = require('../lib/cliLogger').inject;

  var CliLogger, scenario, cliLogger, sampleRequestOptions, sampleOriginalOptions, sampleResponse;
  beforeEach(function() {

    log4jsMock.reset();

    CliLogger = cliLoggerInjector({
      log4js: log4jsMock
    });

    scenario = new ScenarioMock({ name: 'once upon a time' });
    cliLogger = new CliLogger(scenario);
    logger = log4jsMock.getLogger(scenario.name);

    sampleRequestOptions = { method: 'GET', url: 'http://example.com/foo' };
    sampleOriginalOptions = { method: 'get', url: '/foo' };
    sampleResponse = { statusCode: 204 };
  });

  function makeRequest(requestNumber, options) {

    options = _.extend({}, options);
    requestOptions = options.requestOptions || sampleRequestOptions;
    response = options.response || sampleResponse;
    originalOptions = options.originalOptions || sampleOriginalOptions;

    scenario.emit('client:request', requestNumber, requestOptions, originalOptions);

    if (response instanceof Error) {
      scenario.emit('client:error', requestNumber, response);
    } else {
      scenario.emit('client:response', requestNumber, response, Math.floor(Math.random() * 10 + 1));
    }
  }

  it("should log successful HTTP requests with the DEBUG level", function() {

    makeRequest(1);

    expect(logger.totalCalls).toBe(2);
    expect(logger.debug.calls.length).toBe(2);
    expect(logger.debug.calls[0].args).toEqual([ "http[1]".cyan + ' GET /foo' ]);
    expect(logger.debug.calls[1].args[0]).toMatch(new RegExp(RegExp.escape("http[1]".cyan + ' ' + '204 No Content'.green + ' in ') + '\\d+ms$'));
  });

  it("should log failed HTTP requests with the DEBUG level", function() {

    makeRequest(1, { response: new Error('foo') });

    expect(logger.totalCalls).toBe(1);
    expect(logger.debug.calls.length).toBe(1);
    expect(logger.debug.calls[0].args).toEqual([ "http[1]".cyan + ' GET /foo' ]);
  });

  it("should log the HTTP status code in yellow if not in the 200-399 range", function() {

    makeRequest(1, { response: { statusCode: 500, body: 'epic fail' } });

    expect(logger.totalCalls).toBe(2);
    expect(logger.debug.calls.length).toBe(2);
    expect(logger.debug.calls[0].args).toEqual([ "http[1]".cyan + ' GET /foo' ]);
    expect(logger.debug.calls[1].args[0]).toMatch(new RegExp(RegExp.escape("http[1]".cyan + ' ' + '500 Internal Server Error'.yellow + ' in ') + '\\d+ms$'));
  });

  it("should number HTTP requests in the order they are made", function() {

    _.each([ sampleResponse, { statusCode: 500, body: 'oops' }, { statusCode: 200, body: 'bar' } ], function(response, i) {
      makeRequest(i + 1, { response: response });
    });

    expect(logger.totalCalls).toBe(6);
    expect(logger.debug.calls.length).toBe(6);
    expect(logger.debug.calls[0].args).toEqual([ "http[1]".cyan + ' GET /foo' ]);
    expect(logger.debug.calls[1].args[0]).toMatch(new RegExp(RegExp.escape("http[1]".cyan + ' ' + '204 No Content'.green + ' in ') + '\\d+ms$'));
    expect(logger.debug.calls[2].args).toEqual([ "http[2]".cyan + ' GET /foo' ]);
    expect(logger.debug.calls[3].args[0]).toMatch(new RegExp(RegExp.escape("http[2]".cyan + ' ' + '500 Internal Server Error'.yellow + ' in ') + '\\d+ms$'));
    expect(logger.debug.calls[4].args).toEqual([ "http[3]".cyan + ' GET /foo' ]);
    expect(logger.debug.calls[5].args[0]).toMatch(new RegExp(RegExp.escape("http[3]".cyan + ' ' + '200 OK'.green + ' in ') + '\\d+ms$'));
  });

  describe("with the `showRequest` option", function() {

    beforeEach(function() {
      cliLogger.configure({ showRequest: true });
    });

    it("should log HTTP request options with the `showRequest` option", function() {

      makeRequest(1);

      expect(logger.totalCalls).toBe(3);
      expect(logger.debug.calls.length).toBe(3);
      expect(logger.debug.calls[0].args).toEqual([ "http[1]".cyan + ' GET /foo' ]);
      expect(logger.debug.calls[1].args).toEqual([ 'http[1]'.cyan + ' request options: ' + JSON.stringify(sampleRequestOptions).magenta ]);
      expect(logger.debug.calls[2].args[0]).toMatch(new RegExp(RegExp.escape("http[1]".cyan + ' ' + '204 No Content'.green + ' in ') + '\\d+ms$'));
    });
  });

  describe("with the `showResponseBody` option", function() {

    beforeEach(function() {
      cliLogger.configure({ showResponseBody: true });
    });

    it("should not log the HTTP response body if there is none", function() {

      makeRequest(1);

      expect(logger.totalCalls).toBe(2);
      expect(logger.debug.calls.length).toBe(2);
      expect(logger.debug.calls[0].args).toEqual([ "http[1]".cyan + ' GET /foo' ]);
      expect(logger.debug.calls[1].args[0]).toMatch(new RegExp(RegExp.escape("http[1]".cyan + ' ' + '204 No Content'.green + ' in ') + '\\d+ms$'));
    });

    it("should log the HTTP response body", function() {

      var response = { statusCode: 200, body: { bar: 'baz' } };
      makeRequest(1, { response: response });

      expect(logger.totalCalls).toBe(3);
      expect(logger.debug.calls.length).toBe(3);
      expect(logger.debug.calls[0].args).toEqual([ "http[1]".cyan + ' GET /foo' ]);
      expect(logger.debug.calls[1].args[0]).toMatch(new RegExp(RegExp.escape("http[1]".cyan + ' ' + '200 OK'.green + ' in ') + '\\d+ms$'));
      expect(logger.debug.calls[2].args).toEqual([ 'http[1]'.cyan + ' response body: ' + JSON.stringify(response.body).magenta ]);
    });
  });
});
