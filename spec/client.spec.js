var _ = require('underscore'),
    colors = require('colors');

describe("Client", function() {

  var requestMock, Client;
  var RequestMock = require('./support/request.mock'),
      clientInjector = require('../lib/client').inject;

  beforeEach(function() {
    requestMock = new RequestMock();
    Client = clientInjector({
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
      client.on('error', function() {});

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

    it("should emit a `request` and a `response` event when a request succeeds", function() {

      var requestSpy = jasmine.createSpy('client request event'),
          errorSpy = jasmine.createSpy('client error event'),
          responseSpy = jasmine.createSpy('client response event');

      client.on('request', requestSpy);
      client.on('error', errorSpy);
      client.on('response', responseSpy);

      makeRequest(minimalRequestOptions, simpleResponse);

      runs(function() {
        expect(errorSpy).not.toHaveBeenCalled();

        expect(requestSpy.calls.length).toBe(1);
        expect(requestSpy).toHaveBeenCalledWith(1, { method: 'GET', url: '/foo' }, { url: '/foo', method: 'get' });

        expect(responseSpy.calls.length).toBe(1);
        expect(responseSpy.calls[0].args.length).toBe(3);
        expect(responseSpy.calls[0].args[0]).toBe(1);
        expect(responseSpy.calls[0].args[1]).toEqual(simpleResponse);
        expect(typeof(responseSpy.calls[0].args[2])).toBe('number');
      });
    });

    it("should emit a `request` and an `error` event when a request fails", function() {

      var requestSpy = jasmine.createSpy('client request event'),
          errorSpy = jasmine.createSpy('client error event'),
          responseSpy = jasmine.createSpy('client response event');

      client.on('request', requestSpy);
      client.on('error', errorSpy);
      client.on('response', responseSpy);

      makeRequest(minimalRequestOptions, new Error('foo'));

      runs(function() {
        expect(responseSpy).not.toHaveBeenCalled();

        expect(requestSpy.calls.length).toBe(1);
        expect(requestSpy).toHaveBeenCalledWith(1, { method: 'GET', url: '/foo' }, { url: '/foo', method: 'get' });

        expect(errorSpy.calls.length).toBe(1);
        expect(errorSpy).toHaveBeenCalledWith(1, new Error('foo'));
      });
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
  });
});
