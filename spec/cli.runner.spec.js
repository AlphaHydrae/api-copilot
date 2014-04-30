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

  var Runner, mocks, foundScenarios, selectedScenario, scenarioResult, choice, defaultOptions;
  beforeEach(function() {

    h.addMatchers(this);

    choice = undefined;
    foundScenarios = undefined;
    selectedScenario = undefined;
    defaultOptions = { source: 'api', foo: 'bar' };

    mocks = {
      finder: function() {
        return foundScenarios instanceof Error ? q.reject(foundScenarios) : q(foundScenarios);
      },
      scenario: {
        run: function() {
          return scenarioResult instanceof Error ? q.reject(scenarioResult) : q(scenarioResult);
        }
      },
      selector: function() {
        return selectedScenario instanceof Error ? q.reject(selectedScenario) : q(selectedScenario);
      }
    };

    spyOn(mocks, 'finder').andCallThrough();
    spyOn(mocks, 'selector').andCallThrough();
    spyOn(mocks.scenario, 'run').andCallThrough();

    CliLoggerMock.instances.length = 0;

    Runner = runnerInjector({
      Logger: CliLoggerMock,
      selector: mocks.selector,
      finder: mocks.finder
    });
  });

  function run(expectedResult, options) {
    var runner = new Runner(_.extend({}, defaultOptions, options));
    return h.runPromise(runner.execute(choice), expectedResult);
  }

  function setAvailableScenarios() {
    foundScenarios = scenarioFinderUtils.parseFiles(slice.call(arguments));
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

    setAvailableScenarios();
    setSelectedScenario(false);

    var fulfilledSpy = run();

    runs(function() {
      expectFinderCalled();
      expectSelectorCalled([]);
      expectNoScenarioRun();
      expect(fulfilledSpy).toHaveBeenCalledWith(undefined);
    });
  });

  it("should run a selected scenario", function() {

    setAvailableScenarios('api/a.scenario.js', 'api/b.scenario.js');
    setSelectedScenario();
    setScenarioResult('result');

    var fulfilledSpy = run();

    runs(function() {
      expectFinderCalled();
      expectSelectorCalled(foundScenarios);
      expectScenarioRun(fulfilledSpy, 'result');
    });
  });

  it("should run a scenario selected with an argument", function() {

    setAvailableScenarios('api/a.scenario.js', 'api/b.scenario.js');
    setChoice('foo');
    setSelectedScenario();
    setScenarioResult('result with arg');

    var fulfilledSpy = run();

    runs(function() {
      expectFinderCalled();
      expectSelectorCalled(foundScenarios, 'foo');
      expectScenarioRun(fulfilledSpy, 'result with arg');
    });
  });

  it("should run a selected scenario with custom options", function() {

    setAvailableScenarios('api/a.scenario.js', 'api/b.scenario.js');
    setSelectedScenario();
    setScenarioResult('result with custom options');

    var fulfilledSpy = run(true, { baz: 'qux', corge: 'grault' });

    runs(function() {
      expectFinderCalled({ baz: 'qux', corge: 'grault' });
      expectSelectorCalled(foundScenarios, undefined, { baz: 'qux', corge: 'grault' });
      expectScenarioRun(fulfilledSpy, 'result with custom options', { baz: 'qux', corge: 'grault' });
    });
  });

  it("should forward an error from the finder", function() {

    foundScenarios = new Error('finder bug');

    var rejectedSpy = run(false);

    runs(function() {
      expectFinderCalled();
      expectSelectorCalled(false);
      expectNoScenarioRun();
      expectRunError(rejectedSpy, 'finder bug');
    });
  });

  it("should forward an error from the finder", function() {

    setAvailableScenarios('api/a.scenario.js', 'api/b.scenario.js');
    selectedScenario = new Error('selector bug');

    var rejectedSpy = run(false);

    runs(function() {
      expectFinderCalled();
      expectSelectorCalled(foundScenarios);
      expectNoScenarioRun();
      expectRunError(rejectedSpy, 'selector bug');
    });
  });

  function expectFinderCalled(options) {
    if (options === false) {
      expect(mocks.finder).not.toHaveBeenCalled();
    } else {
      expect(mocks.finder).toHaveBeenCalledWith(_.extend({}, defaultOptions, options));
    }
  }

  function expectSelectorCalled(scenarios, choice, options) {
    if (scenarios === false) {
      expect(mocks.selector).not.toHaveBeenCalled();
    } else {
      expect(mocks.selector).toHaveBeenCalledWith(scenarios, choice, _.extend({}, defaultOptions, options));
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
