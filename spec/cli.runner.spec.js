var _ = require('underscore'),
    colors = require('colors'),
    fs = require('fs'),
    h = require('./support/helpers'),
    q = require('q'),
    path = require('path'),
    slice = Array.prototype.slice;

describe("CLI Runner", function() {

  var CliLoggerMock = require('./support/cli.logger.mock'),
      CliSelectorMock = require('./support/cli.selector.mock'),
      ScenarioFinderMock = require('./support/scenario.finder.mock'),
      runnerInjector = require('../lib/cli.runner');

  var Runner, selectorMock, finderMock, finderResults, scenario, choice, defaultOptions;
  beforeEach(function() {

    h.addMatchers(this);

    CliLoggerMock.instances.length = 0;

    selectorMock = new CliSelectorMock();

    finderResults = undefined;
    finderMock = new ScenarioFinderMock();

    choice = undefined;
    scenario = undefined;
    defaultOptions = { source: 'api', foo: 'bar' };

    Runner = runnerInjector({
      Logger: CliLoggerMock,
      selector: selectorMock.selector,
      finder: finderMock.finder
    });
  });

  var runner;
  function run(spy, expectedResult, options) {

    expectedResult = expectedResult !== undefined ? expectedResult : true;

    runner = new Runner(_.extend({}, defaultOptions, options));

    var runArguments = slice.call(arguments, 3);
    choice = runArguments[0];

    runs(function() {
      runner.execute.apply(runner, runArguments)[expectedResult ? 'then' : 'fail'](spy);
    });

    waitsFor(function() {
      return spy.calls.length;
    }, "the runner to have finished running", 50);
  }

  function setScenario(result) {

    if (result) {
      scenario = {
        run: function() {
          return result instanceof Error ? q.reject(result) : q(result);
        }
      };

      spyOn(scenario, 'run').andCallThrough();
    } else {
      scenario = undefined;
    }

    selectorMock.addResult(scenario);
  }

  function setFiles() {
    finderResults = finderMock.addResults(slice.call(arguments));
  }

  it("should do nothing if there are no available scenarios", function() {

    setFiles();
    setScenario();

    var fulfilledSpy = jasmine.createSpy();
    run(fulfilledSpy);

    runs(function() {
      expectNoScenarioCalled();
      expect(CliLoggerMock.instances.length).toBe(0);
      expect(fulfilledSpy).toHaveBeenCalledWith(undefined);
    });
  });

  it("should run a selected scenario", function() {

    setFiles('api/a.scenario.js', 'api/b.scenario.js');
    setScenario('result');

    var fulfilledSpy = jasmine.createSpy();
    run(fulfilledSpy);

    runs(function() {
      expect(fulfilledSpy).toHaveBeenCalledWith('result');
      expectScenarioCalled();
    });
  });

  it("should run a scenario selected with an argument", function() {

    setFiles('api/a.scenario.js', 'api/b.scenario.js');
    setScenario('result selected with arg');

    var fulfilledSpy = jasmine.createSpy();
    run(fulfilledSpy, true, {}, 'foo');

    runs(function() {

      expectFinderCalled();
      expectSelectorCalled(finderResults, 'foo');

      expect(fulfilledSpy).toHaveBeenCalledWith('result selected with arg');
      expectScenarioCalled();
    });
  });

  it("should run a selected scenario with custom options", function() {

    setFiles('api/a.scenario.js', 'api/b.scenario.js');
    setScenario('result with custom options');

    var fulfilledSpy = jasmine.createSpy();
    run(fulfilledSpy, true, { baz: 'qux', corge: 'grault' });

    runs(function() {

      expectFinderCalled({ baz: 'qux', corge: 'grault' });
      expectSelectorCalled(finderResults, undefined, { baz: 'qux', corge: 'grault' });

      expect(fulfilledSpy).toHaveBeenCalledWith('result with custom options');
      expectScenarioCalled({ baz: 'qux', corge: 'grault' });
    });
  });

  it("should forward an error from the finder", function() {

    finderMock.addResults(new Error('finder bug'));

    var rejectedSpy = jasmine.createSpy();
    run(rejectedSpy, false);

    runs(function() {

      expectFinderCalled();
      expect(selectorMock.selector).not.toHaveBeenCalled();
      expectNoScenarioCalled();

      expect(rejectedSpy).toHaveBeenCalled();
      expect(rejectedSpy.calls[0].args[0]).toBeAnError('finder bug');
    });
  });

  it("should forward an error from the finder", function() {

    setFiles('api/a.scenario.js', 'api/b.scenario.js');
    selectorMock.addResult(new Error('selector bug'));

    var rejectedSpy = jasmine.createSpy();
    run(rejectedSpy, false);

    runs(function() {

      expectFinderCalled();
      expectSelectorCalled(finderResults, undefined);
      expectNoScenarioCalled();

      expect(rejectedSpy).toHaveBeenCalled();
      expect(rejectedSpy.calls[0].args[0]).toBeAnError('selector bug');
    });
  });

  function expectRunError(rejectedSpy, message) {

    // check that the returned promise was rejected with the error
    expect(rejectedSpy).toHaveBeenCalled();
    expect(rejectedSpy.calls[0].args[0]).toBeAnError(message);
  }

  function expectFinderCalled(options) {
    expect(finderMock.finder).toHaveBeenCalledWith(_.extend({}, defaultOptions, options));
  }

  function expectSelectorCalled(scenarios, choice, options) {
    expect(selectorMock.selector).toHaveBeenCalledWith(scenarios, choice, _.extend({}, defaultOptions, options));
  }

  function expectScenarioCalled(options) {

    // check that a logger was instantiated with the scenario as argument
    expect(CliLoggerMock.instances.length).toBe(1);
    expect(CliLoggerMock.instances[0].args).toEqual([ scenario ]);

    // check that the scenario was called with the correct options
    expect(scenario.run).toHaveBeenCalledWith(_.extend({}, defaultOptions, options));
  }

  function expectNoScenarioCalled() {

    // check that no scenario was loaded or called
    expect(scenario).toBe(undefined);
  }
});
