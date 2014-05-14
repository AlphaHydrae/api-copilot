var _ = require('underscore'),
    h = require('./support/helpers'),
    ioc = require('../lib/ioc'),
    q = require('q'),
    slice = Array.prototype.slice;

var METHODS = [ 'get', 'head', 'post', 'put', 'patch', 'delete' ];

describe("Scenario Client Extensions", function() {

  var scenarioFactory = require('../lib/scenario'),
      clientExtensionsFactory = require('../lib/scenario.ext.client'),
      log4jsMock = require('./support/log4js.mock'),
      ClientMock = require('./support/client.mock');

  var Scenario, scenario, requestMock, request, defaultSampleResponse;
  beforeEach(function() {

    h.addMatchers(this);

    var clientExtensions = clientExtensionsFactory(ClientMock);

    Scenario = scenarioFactory([ clientExtensions ], log4jsMock, function() {});

    scenario = new Scenario({ name: 'once upon a time' });
    requestMock = scenario.client.requestMock;
    request = scenario.client.request;

    defaultSampleResponse = { statusCode: 204 };
  });

  function addSampleResponse(n, options) {
    _.times(n || 1, function() {
      requestMock.addResponse(_.clone(defaultSampleResponse), options);
    });
  }

  it("should create a client with no arguments", function() {
    expect(scenario.client.args).toEqual([]);
  });

  it("should forward the `configure` event to the client", function() {

    var configureSpy = jasmine.createSpy();
    scenario.client.on('configure', configureSpy);

    scenario.configure({ baz: 'qux', log: 'debug' });
    expect(configureSpy.calls.length).toBe(1);
    expect(configureSpy).toHaveBeenCalledWith({ baz: 'qux', log: 'debug' });
  });

  describe("base URL", function() {

    it("should be prepended to URLs", function() {

      addSampleResponse();

      scenario.step('step', function() {
        return this.get({ url: '/foo' });
      });

      h.runScenario(scenario, true, { runOptions: { baseUrl: 'http://example.com' } });

      runs(function() {
        expect(request.calls.length).toBe(1);
        expect(request.calls[0].args).toEqual([ { method: 'GET', url: 'http://example.com/foo' } ]);
      });
    });

    it("should be used as the URL if no URL is set", function() {

      addSampleResponse();

      scenario.step('step', function() {
        return this.get();
      });

      h.runScenario(scenario, true, { runOptions: { baseUrl: 'http://example.com' } });

      runs(function() {
        expect(request.calls.length).toBe(1);
        expect(request.calls[0].args).toEqual([ { method: 'GET', url: 'http://example.com' } ]);
      });
    });

    it("should be configurable at construction", function() {

      scenario = new Scenario({ name: 'once upon a time', baseUrl: 'http://example.com' });
      requestMock = scenario.client.requestMock;
      request = scenario.client.request;

      addSampleResponse();

      scenario.step('step', function() {
        return this.get({ url: '/foo' });
      });

      h.runScenario(scenario);

      runs(function() {
        expect(request.calls.length).toBe(1);
        expect(request.calls[0].args).toEqual([ { method: 'GET', url: 'http://example.com/foo' } ]);
      });
    });

    it("should be configurable at runtime", function() {

      addSampleResponse(2);

      scenario.step('step 0', function() {
        return this.get({ url: 'http://example.com/foo' });
      });

      scenario.step('step 1', function() {
        this.configure({ baseUrl: 'http://example.com' });
        return this.get({ url: '/bar' });
      });

      h.runScenario(scenario);

      runs(function() {
        expect(request.calls.length).toBe(2);
        expect(request.calls[0].args).toEqual([ { method: 'GET', url: 'http://example.com/foo' } ]);
        expect(request.calls[1].args).toEqual([ { method: 'GET', url: 'http://example.com/bar' } ]);
      });
    });
  });

  describe("default request options", function() {

    it("should be configurable at construction", function() {

      scenario = new Scenario({ name: 'once upon a time', defaultRequestOptions: { foo: 'bar' } });
      requestMock = scenario.client.requestMock;
      request = scenario.client.request;

      addSampleResponse();

      scenario.step('step', function() {
        return this.get({ url: 'http://example.com' });
      });

      h.runScenario(scenario);

      runs(function() {
        expect(request.calls.length).toBe(1);
        expect(request.calls[0].args).toEqual([ { method: 'GET', url: 'http://example.com', foo: 'bar' } ]);
      });
    });

    it("should be configurable with #setDefaultRequestOptions", function() {

      addSampleResponse(4);

      scenario.step('step 0', function() {
      
        // set defaults
        this.setDefaultRequestOptions({ foo: 'bar' });

        // defaults should be merged with options
        return this.get({ url: 'http://example.com' });
      });

      scenario.step('step 1', function() {

        // override previous defaults and set new defaults
        // undefined values should be ignored
        this.setDefaultRequestOptions({ foo: 'baz', qux: 'corge', grault: undefined });

        // request should use new defaults
        return this.post({ url: 'http://example.com' });
      });

      scenario.step('step 2', function() {

        // override defaults
        var promise = this.patch({ url: 'http://example.com', foo: 'grault' });

        // set defaults after request
        this.setDefaultRequestOptions({ garply: 'waldo' });

        return promise;
      });

      scenario.step('step 3', function() {

        // request should use new defaults from previous step
        return this.delete({ url: 'http://example.com' });
      });

      h.runScenario(scenario);

      runs(function() {
        expect(request.calls.length).toBe(4);
        expect(request.calls[0].args).toEqual([ { method: 'GET', url: 'http://example.com', foo: 'bar' } ]);
        expect(request.calls[1].args).toEqual([ { method: 'POST', url: 'http://example.com', foo: 'baz', qux: 'corge' } ]);
        expect(request.calls[2].args).toEqual([ { method: 'PATCH', url: 'http://example.com', foo: 'grault', qux: 'corge' } ]);
        expect(request.calls[3].args).toEqual([ { method: 'DELETE', url: 'http://example.com', garply: 'waldo' } ]);
      });
    });

    it("should be merged with request options", function() {

      addSampleResponse();

      scenario.step('step', function() {
      
        // set defaults
        this.setDefaultRequestOptions({ foo: 'bar', headers: { baz: 'qux' } });

        // defaults should be merged with options
        return this.get({ url: 'http://example.com', corge: 'grault', headers: { baz: undefined, garply: 'waldo' } });
      });

      h.runScenario(scenario);

      runs(function() {
        expect(request.calls.length).toBe(1);
        expect(request.calls[0].args).toEqual([ { method: 'GET', url: 'http://example.com', foo: 'bar', corge: 'grault', headers: { garply: 'waldo' } } ]);
      });
    });

    it("should be extendable with #extendDefaultRequestOptions", function() {

      addSampleResponse(4);

      // set defaults
      scenario.step('step 0', function() {
        this.setDefaultRequestOptions({ foo: 'bar' });
        return this.get({ url: 'http://example.com' });
      });

      // extend defaults; previous defaults should not be overriden
      scenario.step('step 1', function() {
        this.extendDefaultRequestOptions({ baz: 'qux' });
        return this.get({ url: 'http://example.com' });
      });

      // extend defaults with overrides
      scenario.step('step 2', function() {
        this.extendDefaultRequestOptions({ foo: 'corge', grault: 'garply' });
        return this.get({ url: 'http://example.com' });
      });

      // clear defaults with undefined
      scenario.step('step 3', function() {
        this.extendDefaultRequestOptions({ foo: undefined });
        return this.get({ url: 'http://example.com' });
      });

      h.runScenario(scenario);

      runs(function() {
        expect(request.calls.length).toBe(4);
        expect(request.calls[0].args).toEqual([ { method: 'GET', url: 'http://example.com', foo: 'bar' } ]);
        expect(request.calls[1].args).toEqual([ { method: 'GET', url: 'http://example.com', foo: 'bar', baz: 'qux' } ]);
        expect(request.calls[2].args).toEqual([ { method: 'GET', url: 'http://example.com', foo: 'corge', baz: 'qux', grault: 'garply' } ]);
        expect(request.calls[3].args).toEqual([ { method: 'GET', url: 'http://example.com', baz: 'qux', grault: 'garply' } ]);
      });
    });

    it("should be mergeable with #mergeDefaultRequestOptions", function() {

      addSampleResponse(4);

      // set defaults
      scenario.step('step 0', function() {
        this.setDefaultRequestOptions({ yee: 'haw', headers: { foo: 'bar', baz: 'qux' } });
        return this.get({ url: 'http://example.com' });
      });

      // extend defaults; previous defaults should not be overriden
      scenario.step('step 1', function() {
        this.mergeDefaultRequestOptions({ yee: 'p', headers: { baz: 'corge' } });
        return this.get({ url: 'http://example.com' });
      });

      // extend defaults with overrides
      scenario.step('step 2', function() {
        this.mergeDefaultRequestOptions({ headers: { foo: 'corge', grault: 'garply' } });
        return this.get({ url: 'http://example.com' });
      });

      // clear defaults with undefined
      scenario.step('step 3', function() {
        this.mergeDefaultRequestOptions({ yee: undefined, headers: { foo: undefined, grault: 'waldo' } });
        return this.get({ url: 'http://example.com' });
      });

      h.runScenario(scenario);

      runs(function() {
        expect(request.calls.length).toBe(4);
        expect(request.calls[0].args).toEqual([ { method: 'GET', url: 'http://example.com', yee: 'haw', headers: { foo: 'bar', baz: 'qux' } } ]);
        expect(request.calls[1].args).toEqual([ { method: 'GET', url: 'http://example.com', yee: 'p', headers: { foo: 'bar', baz: 'corge' } } ]);
        expect(request.calls[2].args).toEqual([ { method: 'GET', url: 'http://example.com', yee: 'p', headers: { foo: 'corge', baz: 'corge', grault: 'garply' } } ]);
        expect(request.calls[3].args).toEqual([ { method: 'GET', url: 'http://example.com', headers: { baz: 'corge', grault: 'waldo' } } ]);
      });
    });

    it("should be clearable with #clearDefaultRequestOptions", function() {

      addSampleResponse(4);

      // set defaults
      scenario.step('step 0', function() {
        this.setDefaultRequestOptions({ foo: 'bar', baz: 'qux', corge: 'grault', garply: 'waldo', fred: 'plugh' });
        return this.get({ url: 'http://example.com' });
      });

      // clear one default option
      scenario.step('step 1', function() {
        this.clearDefaultRequestOptions('foo');
        return this.get({ url: 'http://example.com' });
      });

      // clear multiple default options
      scenario.step('step 2', function() {
        this.clearDefaultRequestOptions('baz', 'corge');
        return this.get({ url: 'http://example.com' });
      });

      // clear all default options
      scenario.step('step 3', function() {
        this.clearDefaultRequestOptions();
        return this.get({ url: 'http://example.com' });
      });

      h.runScenario(scenario);

      runs(function() {
        expect(request.calls.length).toBe(4);
        expect(request.calls[0].args).toEqual([ { method: 'GET', url: 'http://example.com', foo: 'bar', baz: 'qux', corge: 'grault', garply: 'waldo', fred: 'plugh' } ]);
        expect(request.calls[1].args).toEqual([ { method: 'GET', url: 'http://example.com', baz: 'qux', corge: 'grault', garply: 'waldo', fred: 'plugh' } ]);
        expect(request.calls[2].args).toEqual([ { method: 'GET', url: 'http://example.com', garply: 'waldo', fred: 'plugh' } ]);
        expect(request.calls[3].args).toEqual([ { method: 'GET', url: 'http://example.com' } ]);
      });
    });

    it("should be configurable with the `configure` event", function() {

      addSampleResponse(4);

      scenario.step('step 0', function() {
      
        // set defaults
        this.emit('configure', { defaultRequestOptions: { foo: 'bar' } });

        // defaults should be merged with options
        return this.get({ url: 'http://example.com' });
      });

      scenario.step('step 1', function() {

        // override previous defaults and set new defaults
        this.emit('configure', { defaultRequestOptions: { foo: 'baz', qux: 'corge' } });

        // request should use new defaults
        return this.post({ url: 'http://example.com' });
      });

      scenario.step('step 2', function() {

        // override defaults
        var promise = this.patch({ url: 'http://example.com', foo: 'grault' });

        // set defaults after request
        this.emit('configure', { defaultRequestOptions: { garply: 'waldo' } });

        return promise;
      });

      scenario.step('step 3', function() {

        // request should use new defaults from previous step
        return this.delete({ url: 'http://example.com' });
      });

      h.runScenario(scenario);

      runs(function() {
        expect(request.calls.length).toBe(4);
        expect(request.calls[0].args).toEqual([ { method: 'GET', url: 'http://example.com', foo: 'bar' } ]);
        expect(request.calls[1].args).toEqual([ { method: 'POST', url: 'http://example.com', foo: 'baz', qux: 'corge' } ]);
        expect(request.calls[2].args).toEqual([ { method: 'PATCH', url: 'http://example.com', foo: 'grault', qux: 'corge' } ]);
        expect(request.calls[3].args).toEqual([ { method: 'DELETE', url: 'http://example.com', garply: 'waldo' } ]);
      });
    });

    it("should not override the method of request aliases", function() {

      addSampleResponse(6);

      scenario.step('step', function() { this.setDefaultRequestOptions({ method: 'foo' }); });
      _.each(METHODS, function(method, i) {
        scenario.step('step ' + i, function() { return this[method]({ url: 'http://example.com', bar: 'baz' }); });
      });

      h.runScenario(scenario);

      runs(function() {
        expect(request.calls.length).toBe(6);
        _.each(METHODS, function(method, i) {
          expect(request.calls[i].args).toEqual([ { method: method.toUpperCase(), url: 'http://example.com', bar: 'baz' } ]);
        });
      });
    });
  });

  describe("request filters", function() {

    it("should be configurable in order with #addRequestFilter", function() {

      var filters = [
        function() {},
        function() {},
        function() {}
      ];

      addSampleResponse(3);

      _.each(filters, function(func, i) {
        scenario.step('step ' + i, function() {
          this.addRequestFilter(func);
          return this.get({ url: 'http://example.com' });
        });
      });

      h.runScenario(scenario);

      runs(function() {
        expect(request.calls.length).toBe(3);
        expect(request.calls[0].args).toEqual([ { method: 'GET', url: 'http://example.com', filters: filters.slice(0, 1) } ]);
        expect(request.calls[1].args).toEqual([ { method: 'GET', url: 'http://example.com', filters: filters.slice(0, 2) } ]);
        expect(request.calls[2].args).toEqual([ { method: 'GET', url: 'http://example.com', filters: filters.slice() } ]);
      });
    });

    it("should be configurable by name in order with #addRequestFilter", function() {

      var filters = {
        foo: function() {},
        bar: function() {},
        baz: function() {}
      };

      addSampleResponse(3);

      _.each(filters, function(func, name) {
        scenario.step('step ' + name, function() {
          this.addRequestFilter(name, func);
          return this.get({ url: 'http://example.com' });
        });
      });

      h.runScenario(scenario);

      runs(function() {
        expect(request.calls.length).toBe(3);
        expect(request.calls[0].args).toEqual([ { method: 'GET', url: 'http://example.com', filters: [ filters.foo ] } ]);
        expect(request.calls[1].args).toEqual([ { method: 'GET', url: 'http://example.com', filters: [ filters.foo, filters.bar ] } ]);
        expect(request.calls[2].args).toEqual([ { method: 'GET', url: 'http://example.com', filters: [ filters.foo, filters.bar, filters.baz ] } ]);
      });
    });

    it("should be removable with #removeRequestFilters", function() {

      var filters = [
        function() {},
        function() {},
        function() {}
      ];

      addSampleResponse(3);

      // add filters
      scenario.step('step', function() {

        _.each(filters, function(filter, name) {
          this.addRequestFilter(name, filter);
        }, this);

        return this.get({ url: 'http://example.com' });
      });

      // remove one filter
      scenario.step('step 0', function() {
        this.removeRequestFilters(filters[1]);
        return this.get({ url: 'http://example.com' });
      });

      // remove all filters
      scenario.step('step 1', function() {
        this.removeRequestFilters();
        return this.get({ url: 'http://example.com' });
      });

      h.runScenario(scenario);

      runs(function() {
        expect(request.calls.length).toBe(3);
        expect(request.calls[0].args).toEqual([ { method: 'GET', url: 'http://example.com', filters: filters } ]);
        expect(request.calls[1].args).toEqual([ { method: 'GET', url: 'http://example.com', filters: [ filters[0], filters[2] ] } ]);
        expect(request.calls[2].args).toEqual([ { method: 'GET', url: 'http://example.com' } ]);
      });
    });

    it("should be removable by name with #removeRequestFilters", function() {

      var filters = {
        foo: function() {},
        bar: function() {},
        baz: function() {},
        qux: function() {},
        corge: function() {},
        grault: function() {}
      };

      function getFilters() {

        var names = slice.call(arguments);
        return _.reduce(filters, function(memo, func, name) {

          if (_.contains(names, name)) {
            memo.push(func);
          }

          return memo;
        }, []);
      }

      addSampleResponse(4);

      // add filters
      scenario.step('step', function() {

        _.each(filters, function(filter, name) {
          this.addRequestFilter(name, filter);
        }, this);

        return this.get({ url: 'http://example.com' });
      });

      // remove one filter
      scenario.step('step 0', function() {
        this.removeRequestFilters('foo');
        return this.get({ url: 'http://example.com' });
      });

      // remove multiple filters
      scenario.step('step 1', function() {
        this.removeRequestFilters('bar', 'baz');
        return this.get({ url: 'http://example.com' });
      });

      // remove all filters
      scenario.step('step 2', function() {
        this.removeRequestFilters();
        return this.get({ url: 'http://example.com' });
      });

      h.runScenario(scenario);

      runs(function() {
        expect(request.calls.length).toBe(4);
        expect(request.calls[0].args).toEqual([ { method: 'GET', url: 'http://example.com', filters: getFilters('foo', 'bar', 'baz', 'qux', 'corge', 'grault') } ]);
        expect(request.calls[1].args).toEqual([ { method: 'GET', url: 'http://example.com', filters: getFilters('bar', 'baz', 'qux', 'corge', 'grault') } ]);
        expect(request.calls[2].args).toEqual([ { method: 'GET', url: 'http://example.com', filters: getFilters('qux', 'corge', 'grault') } ]);
        expect(request.calls[3].args).toEqual([ { method: 'GET', url: 'http://example.com' } ]);
      });
    });

    it("should override previous filters with the same name", function() {

      var filters = [
        function(options) {},
        function(options) {},
        function(options) {},
        function(options) {}
      ];

      addSampleResponse();

      scenario.step('step', function() {

        this.addRequestFilter('foo', filters[0]);
        this.addRequestFilter('foo', filters[1]);
        this.addRequestFilter('foo', filters[2]);
        this.addRequestFilter('bar', filters[3]);

        return this.get({ url: 'http://example.com' });
      });

      h.runScenario(scenario);

      runs(function() {
        expect(request.calls.length).toBe(1);
        expect(request.calls[0].args).toEqual([ { method: 'GET', url: 'http://example.com', filters: filters.slice(2, 4) } ]);
      });
    });
  });

  _.each(METHODS, function(method) {

    describe("#" + method, function() {

      it("should call the client's #request method with the method " + method.toUpperCase(), function() {

        addSampleResponse();

        scenario.step('step', function() { return this[method]({ foo: 'bar' }); });

        h.runScenario(scenario);

        runs(function() {
          expect(request.calls.length).toBe(1);
          expect(request).toHaveBeenCalledWith({ method: method.toUpperCase(), foo: 'bar' });
        });
      });
    });
  });

  describe("#request", function() {

    it("should call the client's request method", function() {

      addSampleResponse();

      scenario.step('step', function() { return this.request({ foo: 'bar', baz: 'qux' }); });

      h.runScenario(scenario);

      runs(function() {
        expect(request.calls.length).toBe(1);
        expect(request).toHaveBeenCalledWith({ foo: 'bar', baz: 'qux' });
      });
    });

    it("should return a promise that is resolved if the request is successful", function() {

      addSampleResponse();

      var fulfilledSpy = jasmine.createSpy();

      scenario.step('step', function() {

        var promise = this.request({ foo: 'bar' });
        promise.then(fulfilledSpy);

        return promise;
      });

      h.runScenario(scenario);

      runs(function() {
        expect(request.calls.length).toBe(1);
        expect(request).toHaveBeenCalledWith({ foo: 'bar' });
        expect(fulfilledSpy).toHaveBeenCalledWith(defaultSampleResponse);
      });
    });

    it("should return a promise that is rejected if the request has failed", function() {

      var error = new Error('bug');
      requestMock.addError(error);

      var rejectedSpy = jasmine.createSpy();

      scenario.step('step', function() {

        var promise = this.request({ foo: 'bar' });
        promise.fail(rejectedSpy);

        return promise;
      });

      h.runScenario(scenario, false);

      runs(function() {
        expect(request.calls.length).toBe(1);
        expect(request).toHaveBeenCalledWith({ foo: 'bar' });
        expect(rejectedSpy).toHaveBeenCalledWith(error);
      });
    });

    describe("with an expected `statusCode`", function() {

      it("should return a resolved promise if the status code matches", function() {

        addSampleResponse();

        scenario.step('step', function() {
          return this.request({ foo: 'bar', expect: { statusCode: defaultSampleResponse.statusCode } });
        });

        h.runScenario(scenario);
      });

      it("should return a resolved promise if the status code matches the given regexp", function() {

        addSampleResponse();

        scenario.step('step', function() {
          return this.request({ foo: 'bar', expect: { statusCode: /^2/ } });
        });

        h.runScenario(scenario);
      });

      it("should return a resolved promise if the status code is included in the given array", function() {

        addSampleResponse();

        scenario.step('step', function() {
          return this.request({ foo: 'bar', expect: { statusCode: [ defaultSampleResponse.statusCode, 200, 201, 400 ] } });
        });

        h.runScenario(scenario);
      });

      it("should return a resolved promise if the status code is included in the given array with a regexp", function() {

        addSampleResponse();

        scenario.step('step', function() {
          return this.request({ foo: 'bar', expect: { statusCode: [ 400, /^2/, 500 ] } });
        });

        h.runScenario(scenario);
      });

      it("should return a rejected promise if the status code does not match", function() {

        addSampleResponse();

        scenario.step('step', function() {
          return this.request({ foo: 'bar', expect: { statusCode: 201 } });
        });

        var error;
        h.runScenario(scenario, false).fail(function(err) {
          error = err;
        });

        runs(function() {
          expect(error).toBeAnError('Expected server to respond with status code 201; got ' + defaultSampleResponse.statusCode);
        });
      });

      it("should return a rejected promise if the status code does not match the given regexp", function() {

        addSampleResponse();

        scenario.step('step', function() {
          return this.request({ foo: 'bar', expect: { statusCode: /^5/ } });
        });

        var error;
        h.runScenario(scenario, false).fail(function(err) {
          error = err;
        });

        runs(function() {
          expect(error).toBeAnError('Expected server to respond with status code /^5/; got ' + defaultSampleResponse.statusCode);
        });
      });

      it("should return a rejected promise if the status code does not match any code in the given array", function() {

        addSampleResponse();

        scenario.step('step', function() {
          return this.request({ foo: 'bar', expect: { statusCode: [ /^3/, 400, 500 ] } });
        });

        var error;
        h.runScenario(scenario, false).fail(function(err) {
          error = err;
        });

        runs(function() {
          expect(error).toBeAnError('Expected server to respond with status code in [/^3/,400,500]; got ' + defaultSampleResponse.statusCode);
        });
      });

      it("should return a rejected promise with a custom error message", function() {

        addSampleResponse();

        scenario.step('step', function() {
          return this.request({ foo: 'bar', expect: { statusCode: { value: 201, message: 'server bug' } } });
        });

        var error;
        h.runScenario(scenario, false).fail(function(err) {
          error = err;
        });

        runs(function() {
          expect(error).toBeAnError('server bug');
        });
      });

      it("should return a rejected promise with a custom error message function", function() {

        addSampleResponse();

        scenario.step('step', function() {
          return this.request({
            foo: 'bar',
            expect: {
              statusCode: {
                value: [ 201, 400, 500 ],
                message: function(expected, actual) {
                  return 'Expected ' + actual + ' to be in ' + expected;
                }
              }
            }
          });
        });

        var error;
        h.runScenario(scenario, false).fail(function(err) {
          error = err;
        });

        runs(function() {
          expect(error).toBeAnError('Expected ' + defaultSampleResponse.statusCode + ' to be in 201,400,500');
        });
      });

      it("should return a rejected promise if an error occurs", function() {

        requestMock.addError(new Error('bug'));

        scenario.step('step', function() {
          return this.request({ foo: 'bar', expect: { statusCode: 201 } });
        });

        var error;
        h.runScenario(scenario, false).fail(function(err) {
          error = err;
        });

        runs(function() {
          expect(error).toBeAnError('bug');
        });
      });
    });

    describe("with request pipeline options", function() {
      // TODO: request pipeline should be tested with the actual client implementation (using request mock)

      var requestData, pipelineOptions;
      beforeEach(function() {

        requestData = [];
        scenario.on('client:request', function(number, options) {
          requestData.push({ number: number, options: options, time: new Date().getTime() });
        });

        pipelineOptions = {};
        scenario.step('configuration', function() {
          this.configure(pipelineOptions);
        });
      });

      function setPipelineOptions(options) {
        _.extend(pipelineOptions, options);
      }

      function setUpRequests(n) {

        scenario.step('requests', function() {

          var requests = [];
          _.times(n, function(i) {
            requests.push(this.request({ i: i }));
          }, this);

          return q.all(requests);
        });
      }

      it("should execute requests one by one with a pipeline of 1", function() {

        var n = 5,
            requestDuration = 25;

        addSampleResponse(n, { delay: requestDuration });
        setPipelineOptions({ requestPipeline: 1 });
        setUpRequests(n);

        var start = new Date().getTime();
        h.runScenario(scenario, true, { timeout: (n * requestDuration) + 25 });

        runs(function() {

          expect(requestData.length).toBe(n);

          _.each(n, function(i) {

            expect(requestData[i].number).toBe(i + 1);
            expect(requestData[i].options).toEqual({ i: i });
            expect(requestData[i].time).toBeGreaterThan(start + (requestDuration - 1));
            expect(requestData[i].time).toBeLessThan(start + requestDuration + 10);

            start = requestData[i].time;
          });
        });
      });

      it("should execute requests three by three with a pipeline of 3", function() {

        var n = 9,
            requestPipeline = 3,
            requestDuration = 15;

        addSampleResponse(n, { delay: requestDuration });
        setPipelineOptions({ requestPipeline: requestPipeline });
        setUpRequests(n);

        var start = new Date().getTime();
        h.runScenario(scenario, true, { timeout: ((n / requestPipeline) * requestDuration) + 25 });

        runs(function() {

          expect(requestData.length).toBe(n);

          _.each(n, function(i) {

            expect(requestData[i].number).toBe(i + 1);
            expect(requestData[i].options).toEqual({ i: i });

            expect(requestData[i].time).toBeGreaterThan(start + (requestDuration - 1));
            expect(requestData[i].time).toBeLessThan(start + requestDuration + 10);

            if (i !== 0 && i % 3 === 0) {
              start = requestData[i].time;
            }
          });
        });
      });

      it("should cool down for 10ms after each request", function() {

        var n = 5,
            requestDuration = 5,
            requestCooldown = 10;

        addSampleResponse(n, { delay: requestDuration });
        setPipelineOptions({ requestPipeline: 1, requestCooldown: requestCooldown });
        setUpRequests(n);

        var start = new Date().getTime();
        h.runScenario(scenario, true, { timeout: (n * requestDuration) + ((n - 1) * requestCooldown) + 25 });

        runs(function() {

          expect(requestData.length).toBe(n);

          _.each(n, function(i) {

            expect(requestData[i].number).toBe(i + 1);
            expect(requestData[i].options).toEqual({ i: i });
            expect(requestData[i].time).toBeGreaterThan(start - 1);
            expect(requestData[i].time).toBeLessThan(start + 5);

            start = requestData[i].time + requestDuration + requestCooldown;
          });
        });
      });

      it("should spread requests with a delay of 10ms", function() {

        var n = 5,
            requestDuration = 20,
            requestDelay = 10;

        addSampleResponse(n, { delay: requestDuration });
        setPipelineOptions({ requestDelay: requestDelay });
        setUpRequests(n);

        var start = new Date().getTime();
        h.runScenario(scenario, true, { timeout: ((n - 1) * requestDelay) + requestDuration + 25 });

        runs(function() {

          expect(requestData.length).toBe(n);

          _.each(n, function(i) {

            expect(requestData[i].number).toBe(i + 1);
            expect(requestData[i].options).toEqual({ i: i });
            expect(requestData[i].time).toBeGreaterThan(start + (requestDelay - 1));
            expect(requestData[i].time).toBeLessThan(start + requestDuration);

            start = requestData[i].time;
          });
        });
      });

      _.each({
        requestPipeline: { constraint: 'greater than 0', validValues: [ 1, 5 ], invalidValues: [ 0, -1, -24 ] },
        requestCooldown: { constraint: 'greater than or equal to 0', validValues: [ 0, 250 ], invalidValues: [ -1, -42 ] },
        requestDelay: { constraint: 'greater than or equal to 0', validValues: [ 0, 350 ], invalidValues: [ -1, -66 ] }
      }, function(data, name) {

        _.each(data.validValues, function(value) {

          it("should accept " + value + " for the `" + name + "` option", function() {

            var options = {};
            options[name] = value;
            setPipelineOptions(options);

            var fulfilledSpy = jasmine.createSpy();
            h.runScenario(scenario).then(fulfilledSpy);

            runs(function() {
              expect(fulfilledSpy).toHaveBeenCalledWith(undefined);
            });
          });
        });

        it("should not accept a string for the `" + name + "` option", function() {

          var options = {};
          options[name] = 'asd';
          setPipelineOptions(options);

          var rejectedSpy = jasmine.createSpy();
          h.runScenario(scenario, false).fail(rejectedSpy);

          runs(function() {
            expect(rejectedSpy).toHaveBeenCalled();
            expect(rejectedSpy.calls[0].args[0]).toBeAnError('Expected `' + name + '` option to be a number, got asd (string)');
          });
        });

        it("should not accept NaN for the `" + name + "` option", function() {

          var options = {};
          options[name] = NaN;
          setPipelineOptions(options);

          var rejectedSpy = jasmine.createSpy();
          h.runScenario(scenario, false).fail(rejectedSpy);

          runs(function() {
            expect(rejectedSpy).toHaveBeenCalled();
            expect(rejectedSpy.calls[0].args[0]).toBeAnError('Expected `' + name + '` option to be a number, got NaN (number)');
          });
        });

        _.each(data.invalidValues, function(value) {

          it("should not accept " + value + " for the `" + name + "` option", function() {

            var options = {};
            options[name] = value;
            setPipelineOptions(options);

            var rejectedSpy = jasmine.createSpy();
            h.runScenario(scenario, false).fail(rejectedSpy);

            runs(function() {
              expect(rejectedSpy).toHaveBeenCalled();
              expect(rejectedSpy.calls[0].args[0]).toBeAnError('The `' + name + '` option must be ' + data.constraint + '; got ' + value);
            });
          });
        });
      });
    });
  });
});
