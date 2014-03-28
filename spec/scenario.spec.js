var _ = require('underscore'),
    h = require('./support/helpers');

describe("Scenario", function() {

  var scenarioInjector = require('../lib/scenario').inject,
      log4jsMock = require('./support/log4js.mock'),
      ClientMock = require('./support/client.mock');

  var Scenario, scenario;
  beforeEach(function() {

    Scenario = scenarioInjector({
      log4js: log4jsMock,
      Client: ClientMock
    });

    scenario = new Scenario({ name: 'once upon a time' });
  });

  it("should create a logger with its name", function() {
    spyOn(log4jsMock, 'getLogger');
    new Scenario({ name: 'foo' });
    expect(log4jsMock.getLogger).toHaveBeenCalledWith('foo');
  });

  it("should create a client with no arguments", function() {
    var scenario = new Scenario({ name: 'foo', bar: 'baz' });
    expect(scenario.client.args).toEqual([]);
  });

  it("should throw an error if no step is defined", function() {
    expect(function() { scenario.run(); }).toThrow('No step defined');
  });

  it("should run in the order they were defined by default", function() {

    var data = [];
    _.times(4, function(i) { scenario.step('step ' + i, function() { data.push(i); }); });

    h.runScenario(scenario);

    runs(function() {
      expect(data).toEqual([ 0, 1, 2, 3 ]);
    });
  });

  it("should pass returned data to the next step", function() {

    var stepArgs = [];
    _.each([ 'foo', 'bar', 'baz' ], function(data, i) {
      scenario.step('step ' + i, function() {
        stepArgs.push(Array.prototype.slice.call(arguments));
        return data;
      });
    });

    h.runScenario(scenario);

    runs(function() {
      expect(stepArgs).toEqual([ [], [ 'foo' ], [ 'bar' ] ]);
    });
  });

  it("should return a promise that is resolved if steps return values or resolved promises", function() {

    scenario.step('step 0', function() {});
    scenario.step('step 1', function() { return h.fulfill('foo'); });
    scenario.step('step 2', function() { return 'bar'; });
    scenario.step('step 3', function() { return h.fulfill('baz'); });

    var fulfilledSpy = jasmine.createSpy();
    runs(function() {
      scenario.run().then(fulfilledSpy);
    });

    waitsFor(function() {
      return fulfilledSpy.calls.length;
    }, "The scenario should have finished running.", 50);

    runs(function() {
      expect(fulfilledSpy).toHaveBeenCalledWith(undefined);
    });
  });

  it("should return a promise that is rejected if a step returns a rejected promise", function() {

    var error = new Error('bar');
    scenario.step('step 0', function() {});
    scenario.step('step 1', function() { return h.fulfill('foo'); });
    scenario.step('step 2', function() { return h.reject(error); });

    var rejectedSpy = jasmine.createSpy();

    runs(function() {
      scenario.run().then(undefined, rejectedSpy);
    });

    waitsFor(function() {
      return rejectedSpy.calls.length;
    }, "The scenario should have finished running.", 50);

    runs(function() {
      expect(rejectedSpy).toHaveBeenCalledWith(error);
    });
  });

  describe("#success", function() {

    it("should pass its arguments to the next step", function() {

      var stepArgs = [];
      _.each([ 'foo', 'bar', 'baz' ], function(data, i) {
        scenario.step('step ' + i, function() {

          var args = Array.prototype.slice.call(arguments);
          stepArgs.push(args.slice());
          args.push(data);

          return this.success.apply(this, args);
        });
      });

      h.runScenario(scenario);

      runs(function() {
        expect(stepArgs).toEqual([ [], [ 'foo' ], [ 'foo', 'bar' ] ]);
      });
    });
  });

  describe("#skip", function() {

    it("should skip to the next step", function() {

      var data = [];
      _.times(4, function(i) { scenario.step('step ' + i, function() { data.push(i); return this.skip(); }); });

      h.runScenario(scenario);

      runs(function() {
        expect(data).toEqual([ 0, 1, 2, 3 ]);
      });
    });

    it("should pass arguments after the message to the next step", function() {

      var stepArgs = [];
      _.each([ 'foo', 'bar', 'baz' ], function(data, i) {
        scenario.step('step ' + i, function() {

          var args = Array.prototype.slice.call(arguments);
          stepArgs.push(args.slice());
          args.unshift('skipping step ' + i);
          args.push(data);

          return this.skip.apply(this, args);
        });
      });

      h.runScenario(scenario);

      runs(function() {
        expect(stepArgs).toEqual([ [], [ 'foo' ], [ 'foo', 'bar' ] ]);
      });
    });
  });

  describe("#fail", function() {

    it("should terminate the scenario", function() {

      var data = [],
          error = new Error('foo');

      scenario.step('step 0', function() { data.push(0); });
      scenario.step('step 1', function() { data.push(1); return this.fail(error); });
      scenario.step('step 2', function() { data.push(2); });

      var callbackError;
      h.runScenario(scenario, false).fail(function(err) {
        callbackError = err;
      });

      runs(function() {
        expect(data).toEqual([ 0, 1 ]);
        expect(callbackError).toBe(error);
      });
    });
  });

  describe("#setNextStep", function() {

    it("should cause the scenario to go to the specified step instead of the next one", function() {

      var data = [];
      scenario.step('step 0', function() { data.push(0); this.setNextStep('step 2'); });
      scenario.step('step 1', function() { data.push(1); });
      scenario.step('step 2', function() { data.push(2); });
      scenario.step('step 3', function() { data.push(3); });

      h.runScenario(scenario);

      runs(function() {
        expect(data).toEqual([ 0, 2, 3 ]);
      });
    });

    it("should cause the scenario to fail if the specified step doesn't exist", function() {

      var data = [];
      scenario.step('step 0', function() { data.push(0); });
      scenario.step('step 1', function() { data.push(1); this.setNextStep('unknown'); });
      scenario.step('step 2', function() { data.push(2); });

      var error;
      h.runScenario(scenario, false).fail(function(err) {
        error = err;
      });

      runs(function() {
        expect(error).toEqual(new Error('No such step defined: "unknown"'));
      });
    });
  });

  describe("#defer", function() {

    it("should return a deferred object", function() {

      var deferred = scenario.defer();
      expect(typeof deferred.resolve).toBe('function');
      expect(typeof deferred.reject).toBe('function');
      expect(typeof deferred.promise).toBe('object');

      var successful;
      deferred.promise.then(function() {
        successful =  true;
      }, function() {
        successful = false;
      });

      runs(function() {
        deferred.resolve();
      });

      waitsFor(function() {
        return typeof(successful) != 'undefined';
      }, "The promise should be resolved.", 50);

      runs(function() {
        expect(successful).toBe(true);
      });
    });
  });
});
