var _ = require('underscore'),
    colors = require('colors'),
    fs = require('fs'),
    h = require('./support/helpers'),
    q = require('q'),
    path = require('path'),
    slice = Array.prototype.slice;

describe("CLI Runner", function() {

  var CliLoggerMock = require('./support/cli.logger.mock'),
      scenarioFinderUtils = require('./support/scenario.finder.utils'),
      runnerInjector = require('../lib/cli.runner');

  var Runner, mocks, selectedScenario, scenarioResult, choice, defaultOptions;
  beforeEach(function() {

    h.addMatchers(this);

    choice = undefined;
    selectedScenario = undefined;
    defaultOptions = { source: 'api', foo: 'bar' };

    mocks = {
      scenario: {
        run: function() {
          return scenarioResult instanceof Error ? q.reject(scenarioResult) : q(scenarioResult);
        }
      },
      cliSelector: function() {
        return selectedScenario instanceof Error ? q.reject(selectedScenario) : q(selectedScenario);
      }
    };

    spyOn(mocks, 'cliSelector').andCallThrough();
    spyOn(mocks.scenario, 'run').andCallThrough();

    CliLoggerMock.instances.length = 0;

    Runner = runnerInjector({
      Logger: CliLoggerMock,
      cliSelector: mocks.cliSelector
    });
  });

  function run(expectedResult, options) {
    var runner = new Runner(_.extend({}, defaultOptions, options));
    return h.runPromise(runner.execute(choice), expectedResult);
  }

  function setSelectedScenario(scenario) {
    selectedScenario = scenario === false ? undefined : scenario || mocks.scenario;
  }

  function setScenarioResult(result) {
    scenarioResult = result;
  }

  function setChoice(newChoice) {
    choice = newChoice;
  }

  it("should do nothing if there are no available scenarios", function() {

    setSelectedScenario(false);

    var fulfilledSpy = run();

    runs(function() {
      expectSelectorCalled();
      expectNoScenarioRun();
      expect(fulfilledSpy).toHaveBeenCalledWith(undefined);
    });
  });

  it("should run a selected scenario", function() {

    setSelectedScenario();
    setScenarioResult('result');

    var fulfilledSpy = run();

    runs(function() {
      expectSelectorCalled();
      expectScenarioRun(fulfilledSpy, 'result');
    });
  });

  it("should run a scenario selected with an argument", function() {

    setChoice('foo');
    setSelectedScenario();
    setScenarioResult('result with arg');

    var fulfilledSpy = run();

    runs(function() {
      expectSelectorCalled('foo');
      expectScenarioRun(fulfilledSpy, 'result with arg');
    });
  });

  it("should run a selected scenario with custom options", function() {

    setSelectedScenario();
    setScenarioResult('result with custom options');

    var fulfilledSpy = run(true, { baz: 'qux', corge: 'grault' });

    runs(function() {
      expectSelectorCalled(undefined, { baz: 'qux', corge: 'grault' });
      expectScenarioRun(fulfilledSpy, 'result with custom options', { baz: 'qux', corge: 'grault' });
    });
  });

  it("should forward an error from the selector", function() {

    setSelectedScenario(new Error('selector bug'));

    var rejectedSpy = run(false);

    runs(function() {
      expectSelectorCalled();
      expectNoScenarioRun();
      expectRunError(rejectedSpy, 'selector bug');
    });
  });

  function expectSelectorCalled(choice, options) {
    if (choice === false) {
      expect(mocks.cliSelector).not.toHaveBeenCalled();
    } else {
      expect(mocks.cliSelector).toHaveBeenCalledWith(choice, _.extend({}, defaultOptions, options));
    }
  }

  function expectRunError(rejectedSpy, message) {

    // check that the returned promise was rejected with the error
    expect(rejectedSpy).toHaveBeenCalled();
    expect(rejectedSpy.calls[0].args[0]).toBeAnError(message);
  }

  function expectScenarioRun(fulfilledSpy, result, options) {

    // check that a logger was instantiated with the scenario as argument
    expect(CliLoggerMock.instances.length).toBe(1);
    expect(CliLoggerMock.instances[0].args).toEqual([ mocks.scenario ]);

    // check that the scenario was called with the correct options
    expect(mocks.scenario.run).toHaveBeenCalledWith(_.extend({}, defaultOptions, options));

    // check that the promise was resolved with the scenario result
    expect(fulfilledSpy).toHaveBeenCalledWith(result);
  }

  function expectNoScenarioRun() {

    // check that no logger was instantiated
    expect(CliLoggerMock.instances.length).toBe(0);

    // check that the mock scenario was not called
    expect(mocks.scenario.run).not.toHaveBeenCalled();
  }
});
