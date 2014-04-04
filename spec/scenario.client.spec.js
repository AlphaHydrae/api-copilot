var _ = require('underscore'),
    h = require('./support/helpers'),
    slice = Array.prototype.slice;

var METHODS = [ 'get', 'head', 'post', 'put', 'patch', 'delete' ];

describe("Scenario Client Extensions", function() {

  var scenarioInjector = require('../lib/scenario').inject,
      log4jsMock = require('./support/log4js.mock'),
      ClientMock = require('./support/client.mock');

  var Scenario, scenario, request;
  beforeEach(function() {

    Scenario = scenarioInjector({
      log4js: log4jsMock,
      Client: ClientMock
    });

    scenario = new Scenario({ name: 'once upon a time' });
    request = scenario.client.request;
  });

  describe("base URL", function() {

    it("should be prepended to URLs", function() {

      scenario.step('step', function() {
        this.get({ url: '/foo' });
      });

      h.runScenario(scenario, true, { runOptions: { baseUrl: 'http://example.com' } });

      runs(function() {
        expect(request.calls.length).toBe(1);
        expect(request.calls[0].args).toEqual([ { method: 'GET', url: 'http://example.com/foo' } ]);
      });
    });

    it("should be configurable at construction", function() {

      scenario = new Scenario({ name: 'once upon a time', baseUrl: 'http://example.com' });
      request = scenario.client.request;

      scenario.step('step', function() {
        this.get({ url: '/foo' });
      });

      h.runScenario(scenario);

      runs(function() {
        expect(request.calls.length).toBe(1);
        expect(request.calls[0].args).toEqual([ { method: 'GET', url: 'http://example.com/foo' } ]);
      });
    });

    it("should be configurable at runtime", function() {

      scenario.step('step 0', function() {
        this.get({ url: 'http://example.com/foo' });
      });

      scenario.step('step 1', function() {
        this.configure({ baseUrl: 'http://example.com' });
        this.get({ url: '/bar' });
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
      request = scenario.client.request;

      scenario.step('step', function() {
        this.get({ url: 'http://example.com' });
      });

      h.runScenario(scenario);

      runs(function() {
        expect(request.calls.length).toBe(1);
        expect(request.calls[0].args).toEqual([ { method: 'GET', url: 'http://example.com', foo: 'bar' } ]);
      });
    });

    it("should be configurable with #setDefaultRequestOptions", function() {

      scenario.step('step 0', function() {
      
        // set defaults
        this.setDefaultRequestOptions({ foo: 'bar' });

        // defaults should be merged with options
        this.get({ url: 'http://example.com' });
      });

      scenario.step('step 1', function() {

        // override previous defaults and set new defaults
        this.setDefaultRequestOptions({ foo: 'baz', qux: 'corge' });

        // request should use new defaults
        this.post({ url: 'http://example.com' });
      });

      scenario.step('step 2', function() {

        // override defaults
        this.patch({ url: 'http://example.com', foo: 'grault' });

        // set defaults after request
        this.setDefaultRequestOptions({ garply: 'waldo' });
      });

      scenario.step('step 3', function() {

        // request should use new defaults from previous step
        this.delete({ url: 'http://example.com' });
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

    it("should be extendable with #extendDefaultRequestOptions", function() {

      // set defaults
      scenario.step('step 0', function() {
        this.setDefaultRequestOptions({ foo: 'bar' });
        this.get({ url: 'http://example.com' });
      });

      // extend defaults; previous defaults should not be overriden
      scenario.step('step 1', function() {
        this.extendDefaultRequestOptions({ baz: 'qux' });
        this.get({ url: 'http://example.com' });
      });

      // extend defaults with overrides
      scenario.step('step 2', function() {
        this.extendDefaultRequestOptions({ foo: 'corge', grault: 'garply' });
        this.get({ url: 'http://example.com' });
      });

      // clear defaults with undefined
      scenario.step('step 3', function() {
        this.extendDefaultRequestOptions({ foo: undefined });
        this.get({ url: 'http://example.com' });
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

    it("should be clearable with #clearDefaultRequestOptions", function() {

      // set defaults
      scenario.step('step 0', function() {
        this.setDefaultRequestOptions({ foo: 'bar', baz: 'qux', corge: 'grault', garply: 'waldo', fred: 'plugh' });
        this.get({ url: 'http://example.com' });
      });

      // clear one default option
      scenario.step('step 1', function() {
        this.clearDefaultRequestOptions('foo');
        this.get({ url: 'http://example.com' });
      });

      // clear multiple default options
      scenario.step('step 2', function() {
        this.clearDefaultRequestOptions('baz', 'corge');
        this.get({ url: 'http://example.com' });
      });

      // clear all default options
      scenario.step('step 3', function() {
        this.clearDefaultRequestOptions();
        this.get({ url: 'http://example.com' });
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

      scenario.step('step 0', function() {
      
        // set defaults
        this.emit('configure', { defaultRequestOptions: { foo: 'bar' } });

        // defaults should be merged with options
        this.get({ url: 'http://example.com' });
      });

      scenario.step('step 1', function() {

        // override previous defaults and set new defaults
        this.emit('configure', { defaultRequestOptions: { foo: 'baz', qux: 'corge' } });

        // request should use new defaults
        this.post({ url: 'http://example.com' });
      });

      scenario.step('step 2', function() {

        // override defaults
        this.patch({ url: 'http://example.com', foo: 'grault' });

        // set defaults after request
        this.emit('configure', { defaultRequestOptions: { garply: 'waldo' } });
      });

      scenario.step('step 3', function() {

        // request should use new defaults from previous step
        this.delete({ url: 'http://example.com' });
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

      scenario.step('step', function() { this.setDefaultRequestOptions({ method: 'foo' }); });
      _.each(METHODS, function(method, i) {
        scenario.step('step ' + i, function() { this[method]({ url: 'http://example.com', bar: 'baz' }); });
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

      _.each(filters, function(func, i) {
        scenario.step('step ' + i, function() {
          this.addRequestFilter(func);
          this.get({ url: 'http://example.com' });
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

      _.each(filters, function(func, name) {
        scenario.step('step ' + name, function() {
          this.addRequestFilter(name, func);
          this.get({ url: 'http://example.com' });
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

      // add filters
      scenario.step('step', function() {

        _.each(filters, function(filter, name) {
          this.addRequestFilter(name, filter);
        }, this);

        this.get({ url: 'http://example.com' });
      });

      // remove one filter
      scenario.step('step 0', function() {
        this.removeRequestFilters(filters[1]);
        this.get({ url: 'http://example.com' });
      });

      // remove all filters
      scenario.step('step 1', function() {
        this.removeRequestFilters();
        this.get({ url: 'http://example.com' });
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

      // add filters
      scenario.step('step', function() {

        _.each(filters, function(filter, name) {
          this.addRequestFilter(name, filter);
        }, this);

        this.get({ url: 'http://example.com' });
      });

      // remove one filter
      scenario.step('step 0', function() {
        this.removeRequestFilters('foo');
        this.get({ url: 'http://example.com' });
      });

      // remove multiple filters
      scenario.step('step 1', function() {
        this.removeRequestFilters('bar', 'baz');
        this.get({ url: 'http://example.com' });
      });

      // remove all filters
      scenario.step('step 2', function() {
        this.removeRequestFilters();
        this.get({ url: 'http://example.com' });
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

      scenario.step('step', function() {

        this.addRequestFilter('foo', filters[0]);
        this.addRequestFilter('foo', filters[1]);
        this.addRequestFilter('foo', filters[2]);
        this.addRequestFilter('bar', filters[3]);

        this.get({ url: 'http://example.com' });
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

        scenario.step('step', function() { this[method]({ foo: 'bar' }); });

        h.runScenario(scenario);

        runs(function() {
          expect(request).toHaveBeenCalledWith({ method: method.toUpperCase(), foo: 'bar' });
        });
      });
    });
  });

  describe("#request", function() {

    it("should call the client's request method", function() {

      scenario.step('step', function() { this.request({ foo: 'bar', baz: 'qux' }); });

      h.runScenario(scenario);

      runs(function() {
        expect(request).toHaveBeenCalledWith({ foo: 'bar', baz: 'qux' });
      });
    });
  });
});
