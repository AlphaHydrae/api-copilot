var _ = require('underscore'),
    colors = require('colors');

RegExp.escape = function(s) {
  return s.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
};

describe("Client", function() {

  var requestMock, Client;
  var LoggerMock = require('./support/logger.mock'),
      RequestMock = require('./support/request.mock'),
      ClientInjector = require('../lib/client').inject;

  beforeEach(function() {
    requestMock = new RequestMock();
    Client = ClientInjector({
      request: requestMock.func()
    });
  });

  it("should accept no options", function() {
    new Client();
  });

  describe("#request", function() {

    var client, minimalRequestOptions, simpleResponse;
    beforeEach(function() {

      client = new Client({});

      minimalRequestOptions = {
        url: '/foo',
        method: 'get'
      };

      simpleResponse = {
        statusCode: 204
      };
    });

    function makeRequest(req, res, definition) {

      var done = false;

      runs(function() {
        requestMock[res instanceof Error ? 'addError' : 'addResponse'](res);
        client.request(req).fin(function() { done = true; });
      });

      waitsFor(function() {
        return done;
      }, 'The client request should be completed', 50);
    }

    it("should not accept options that are not an object", function() {
      _.each([ null, 'string', [], 4.2 ], function(invalidOptions) {
        expect(function() {
          client.request(invalidOptions);
        }).toThrow();
      });
    });

    it("should require the `method` option", function() {
      expect(function() {
        client.request(_.omit(minimalRequestOptions, 'method'));
      }).toThrow('"method" must be a string, got undefined');
    });

    it("should require the `method` option to be a string", function() {
      expect(function() {
        client.request(_.extend(minimalRequestOptions, { method: 2.4 }));
      }).toThrow('"method" must be a string, got 2.4');
    });

    it("should require the `url` option", function() {
      expect(function() {
        client.request(_.omit(minimalRequestOptions, 'url'));
      }).toThrow('"url" must be a string, got undefined');
    });

    it("should require the `url` option to be a string", function() {
      expect(function() {
        client.request(_.extend(minimalRequestOptions, { url: 6.6 }));
      }).toThrow('"url" must be a string, got 6.6');
    });

    it("should return a promise that is resolved if the request succeeds", function() {

      requestMock.addResponse(simpleResponse);

      var done = false,
          success = jasmine.createSpy('success'),
          failure = jasmine.createSpy('failure');

      runs(function() {
        client.request(minimalRequestOptions).then(success, failure).fin(function() { done = true; });
      });

      waitsFor(function() {
        return done;
      }, 'The client request should be completed', 50);

      runs(function() {
        expect(failure).not.toHaveBeenCalled();
        expect(success.calls.length).toBe(1);
        expect(success).toHaveBeenCalledWith(simpleResponse);
      });
    });

    it("should return a promise that is rejected if the request fails", function() {

      var err = new Error('foo');
      requestMock.addError(err);

      var done = false,
          success = jasmine.createSpy('success'),
          failure = jasmine.createSpy('failure');

      runs(function() {
        client.request(minimalRequestOptions).then(success, failure).fin(function() { done = true; });
      });

      waitsFor(function() {
        return done;
      }, 'The client request should be completed', 50);

      runs(function() {
        expect(success).not.toHaveBeenCalled();
        expect(failure.calls.length).toBe(1);
        expect(failure).toHaveBeenCalledWith(err);
      });
    });

    it("should convert the `method` option to uppercase", function() {
      requestMock.addResponse(simpleResponse);
      client.request(minimalRequestOptions);
      expect(requestMock.lastRequestOptions).toEqual({ url: '/foo', method: 'GET' });
    });

    describe("with the `baseUrl` option", function() {

      beforeEach(function() {
        client.configure({ baseUrl: 'http://example.com' });
      });

      it("should prepend the base URL to the `url` option", function() {
        requestMock.addResponse(simpleResponse);
        client.request(minimalRequestOptions);
        expect(requestMock.requestCount).toBe(1);
        expect(requestMock.lastRequestOptions).toEqual({ url: 'http://example.com/foo', method: 'GET' });
      });
    });

    describe("with the `filters` option", function() {

      var filter1 = function(options) { options.headers = { 'X-Signature': options.method + ' ' + options.url }; },
          filter2 = function(options) { options.foo = 24; },
          filter3 = function(options) { options.bar = 42; },
          filter4 = function(options) { options.baz = options.foo + options.bar; };

      it("should allow a filter to modify the request options", function() {
        requestMock.addResponse(simpleResponse);
        client.request(_.extend(minimalRequestOptions, { filters: [ filter1 ] }));
        expect(requestMock.requestCount).toBe(1);
        expect(requestMock.lastRequestOptions).toEqual({ url: '/foo', method: 'GET', headers: { 'X-Signature': 'GET /foo' } });
      });

      it("should allow filters to incrementally build request options", function() {
        requestMock.addResponse(simpleResponse);
        client.request(_.extend(minimalRequestOptions, { filters: [ filter2, filter3, filter4 ] }));
        expect(requestMock.requestCount).toBe(1);
        expect(requestMock.lastRequestOptions).toEqual({ url: '/foo', method: 'GET', foo: 24, bar: 42, baz: 66 });
      });
    });

    describe("with the `logger` option", function() {

      var logger;
      beforeEach(function() {
        logger = new LoggerMock();
        client.configure({ logger: logger });
      });

      it("should log successful HTTP requests with the DEBUG level", function() {

        makeRequest(minimalRequestOptions, simpleResponse);

        runs(function() {
          expect(logger.debug.calls.length).toBe(2);
          expect(logger.debug.calls[0].args).toEqual([ "http[1]".cyan + ' GET /foo' ]);
          expect(logger.debug.calls[1].args[0]).toMatch(new RegExp(RegExp.escape("http[1]".cyan + ' ' + '204 No Content'.green + ' in ') + '\\d+ms$'));
        });
      });

      it("should not log failed HTTP requests with the DEBUG level", function() {

        makeRequest(minimalRequestOptions, new Error('foo'));

        runs(function() {
          expect(logger.debug.calls.length).toBe(1);
          expect(logger.debug.calls[0].args).toEqual([ "http[1]".cyan + ' GET /foo' ]);
        });
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
    });
  });
});
