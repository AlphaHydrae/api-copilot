var _ = require('underscore'),
    q = require('q');

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

  function runScenario() {

    var done = false;
    runs(function() {
      scenario.run().fin(function() { done = true; });
    });

    waitsFor(function() {
      return done;
    }, "The scenario should have finished running.", 50);
  }

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

    runScenario();

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

    runScenario();

    runs(function() {
      expect(stepArgs).toEqual([ [], [ 'foo' ], [ 'bar' ] ]);
    });
  });

  describe("#success", function() {

    it("should pass data returned through #success to the next step", function() {

      var stepArgs = [];
      _.each([ 'foo', 'bar', 'baz' ], function(data, i) {
        scenario.step('step ' + i, function() {

          var args = Array.prototype.slice.call(arguments);
          stepArgs.push(args.slice());
          args.push(data);

          return this.success.apply(this, args);
        });
      });

      runScenario();

      runs(function() {
        expect(stepArgs).toEqual([ [], [ 'foo' ], [ 'foo', 'bar' ] ]);
      });
    });
  });

  describe("#skip", function() {

    it("should skip to the next step", function() {

      var data = [];
      _.times(4, function(i) { scenario.step('step ' + i, function() { data.push(i); return this.skip(); }); });

      runScenario();

      runs(function() {
        expect(data).toEqual([ 0, 1, 2, 3 ]);
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
