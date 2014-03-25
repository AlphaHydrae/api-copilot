var _ = require('underscore');

RegExp.escape = function(s) {
  return s.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
};

describe("CLI Logger", function() {

  var log4jsMock = require('./support/log4js.mock'),
      ScenarioMock = require('./support/scenario.mock'),
      cliLoggerInjector = require('../lib/cliLogger').inject;

  var CliLogger, scenario, cliLogger;
  beforeEach(function() {

    CliLogger = cliLoggerInjector({
      log4js: log4jsMock
    });

    scenario = new ScenarioMock({ name: 'once upon a time' });
    cliLogger = new CliLogger(scenario);
    logger = log4jsMock.getLogger(scenario.name);
  });

  it("should log successful HTTP requests with the DEBUG level", function() {

    scenario.emit('client:request', 1, { method: 'GET', url: 'http://example.com/foo' }, { method: 'get', url: '/foo' });
    scenario.emit('client:response', 1, { statusCode: 204 }, 3);

    expect(logger.debug.calls.length).toBe(2);
    expect(logger.debug.calls[0].args).toEqual([ "http[1]".cyan + ' GET /foo' ]);
    expect(logger.debug.calls[1].args[0]).toMatch(new RegExp(RegExp.escape("http[1]".cyan + ' ' + '204 No Content'.green + ' in ') + '\\d+ms$'));
  });

  /*it("should log failed HTTP requests with the DEBUG level", function() {

    scenario.emit('client:request', 1, { method: 'GET', url: 'http://example.com/foo' }, { method: 'get', url: '/foo' });
    scenario.emit('client:error', new Error('foo'));

    expect(logger.debug.calls.length).toBe(1);
    expect(logger.debug.calls[0].args).toEqual([ "http[1]".cyan + ' GET /foo' ]);
  });*/

  /*describe("with the `logger` option", function() {

      var logger;
      beforeEach(function() {
        logger = new LoggerMock();
        client.configure({ logger: logger });
      });


      it("should log the HTTP status code in yellow if not in the 200-399 range", function() {

        makeRequest(minimalRequestOptions, { statusCode: 400, body: 'epic fail' });

        runs(function() {
          expect(logger.debug.calls.length).toBe(2);
          expect(logger.debug.calls[0].args).toEqual([ "http[1]".cyan + ' GET /foo' ]);
          expect(logger.debug.calls[1].args[0]).toMatch(new RegExp(RegExp.escape("http[1]".cyan + ' ' + '400 Bad Request'.yellow + ' in ') + '\\d+ms$'));
        });
      });

      it("should number HTTP requests in the order they are made", function() {

        _.each([ simpleResponse, { statusCode: 500, body: 'oops' }, { statusCode: 200, body: 'bar' } ], function(response) {
          makeRequest(minimalRequestOptions, response);
        });

        runs(function() {
          expect(logger.debug.calls.length).toBe(6);
          expect(logger.debug.calls[0].args).toEqual([ "http[1]".cyan + ' GET /foo' ]);
          expect(logger.debug.calls[1].args[0]).toMatch(new RegExp(RegExp.escape("http[1]".cyan + ' ' + '204 No Content'.green + ' in ') + '\\d+ms$'));
          expect(logger.debug.calls[2].args).toEqual([ "http[2]".cyan + ' GET /foo' ]);
          expect(logger.debug.calls[3].args[0]).toMatch(new RegExp(RegExp.escape("http[2]".cyan + ' ' + '500 Internal Server Error'.yellow + ' in ') + '\\d+ms$'));
          expect(logger.debug.calls[4].args).toEqual([ "http[3]".cyan + ' GET /foo' ]);
          expect(logger.debug.calls[5].args[0]).toMatch(new RegExp(RegExp.escape("http[3]".cyan + ' ' + '200 OK'.green + ' in ') + '\\d+ms$'));
        });
      });

      it("should log HTTP request options with the `showRequest` option", function() {

        client.configure({ showRequest: true });
        makeRequest(minimalRequestOptions, simpleResponse);

        runs(function() {
          expect(logger.debug.calls.length).toBe(3);
          expect(logger.debug.calls[0].args).toEqual([ "http[1]".cyan + ' GET /foo' ]);
          expect(logger.debug.calls[1].args).toEqual([ 'http[1]'.cyan + ' request options: ' + JSON.stringify({ url: '/foo', method: 'GET' }).magenta ]);
          expect(logger.debug.calls[2].args[0]).toMatch(new RegExp(RegExp.escape("http[1]".cyan + ' ' + '204 No Content'.green + ' in ') + '\\d+ms$'));
        });
      });

      describe("with the `showResponseBody` option", function() {

        beforeEach(function() {
          client.configure({ showResponseBody: true });
        });

        it("should not log the HTTP response body if there is none", function() {

          makeRequest(minimalRequestOptions, simpleResponse);

          runs(function() {
            expect(logger.debug.calls.length).toBe(2);
            expect(logger.debug.calls[0].args).toEqual([ "http[1]".cyan + ' GET /foo' ]);
            expect(logger.debug.calls[1].args[0]).toMatch(new RegExp(RegExp.escape("http[1]".cyan + ' ' + '204 No Content'.green + ' in ') + '\\d+ms$'));
          });
        });

        it("should log the HTTP response body", function() {

          var response = { statusCode: 200, body: { bar: 'baz' } };
          makeRequest(minimalRequestOptions, response);

          runs(function() {
            expect(logger.debug.calls.length).toBe(3);
            expect(logger.debug.calls[0].args).toEqual([ "http[1]".cyan + ' GET /foo' ]);
            expect(logger.debug.calls[1].args[0]).toMatch(new RegExp(RegExp.escape("http[1]".cyan + ' ' + '200 OK'.green + ' in ') + '\\d+ms$'));
            expect(logger.debug.calls[2].args).toEqual([ 'http[1]'.cyan + ' response body: ' + JSON.stringify(response.body).magenta ]);
          });
        });
      });
    });*/
});
