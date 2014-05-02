var _ = require('underscore'),
    h = require('./support/helpers'),
    slice = Array.prototype.slice;

var METHODS = [ 'get', 'head', 'post', 'put', 'patch', 'delete' ];

describe("Scenario Client Extensions", function() {

  var scenarioInjector = require('../lib/scenario'),
      log4jsMock = require('./support/log4js.mock'),
      ClientMock = require('./support/client.mock');

  var Scenario, scenario, requestMock, request, defaultSampleResponse;
  beforeEach(function() {

    h.addMatchers(this);

    Scenario = scenarioInjector({
      log4js: log4jsMock,
      Client: ClientMock
    });

    scenario = new Scenario({ name: 'once upon a time' });
    requestMock = scenario.client.requestMock;
    request = scenario.client.request;

    defaultSampleResponse = { statusCode: 204 };
  });

  function addSampleResponse(n) {
    _.times(n || 1, function() {
      requestMock.addResponse(_.clone(defaultSampleResponse));
    });
  }

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
  });
});
