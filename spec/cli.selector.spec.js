var _ = require('underscore'),
    h = require('./support/helpers'),
    path = require('path'),
    slice = Array.prototype.slice;

describe("CLI Selector", function() {

  var CliListingMock = require('./support/cli.listing.mock'),
      scenarioFinderUtils = require('./support/scenario.finder.utils'),
      cliSelectorInjector = require('../lib/cli.selector');

  var selector, mocks, loadedScenario, listingMock, readlineAnswer, scenarios, choice;
  beforeEach(function() {

    h.addMatchers(this);

    loadedScenario = undefined;
    readlineAnswer = undefined;

    mocks = {
      loader: function() {
        return loadedScenario;
      },
      readlineInterface: {
        question: function(query, callback) {
          callback(readlineAnswer);
        },
        close: function() {}
      },
      readline: {
        createInterface: function() {
          return mocks.readlineInterface;
        }
      }
    };

    spyOn(mocks, 'loader').andCallThrough();
    spyOn(mocks.readlineInterface, 'question').andCallThrough();
    spyOn(mocks.readlineInterface, 'close');
    spyOn(mocks.readline, 'createInterface').andCallThrough();

    CliListingMock.instances.length = 0;

    choice = undefined;
    scenarios = undefined;

    selector = cliSelectorInjector({
      readline: mocks.readline,
      scenarioLoader: mocks.loader,
      Listing: CliListingMock
    });
  });

  function select(expectedResult, options) {
    if (!scenarios) {
      throw new Error('No scenarios mocked');
    }

    var promise = selector(scenarios, choice, _.extend({}, options));
    return h.runPromise(promise, expectedResult);
  }

  function setScenarios() {
    scenarios = scenarioFinderUtils.parseFiles(slice.call(arguments));
  }

  function setChoice(newChoice) {
    choice = newChoice;
  }

  function setLoadedScenario(scenario) {
    loadedScenario = { result: scenario };
  }

  function setReadlineAnswer(answer) {
    readlineAnswer = answer;
  }

  it("should select nothing if there are no available scenarios", function() {

    setScenarios();

    var fulfilledSpy = select();

    runs(function() {
      expectListingDisplayed(true);
      expectReadlineCalled(false);
      expectLoaderCalled(false);
      expectScenarioSelected(fulfilledSpy, undefined);
    });
  });

  it("should automatically run a single available scenario", function() {

    setScenarios('api/a.scenario.js');
    setLoadedScenario('single');

    var fulfilledSpy = select();

    runs(function() {
      expectListingDisplayed(false);
      expectReadlineCalled(false);
      expectLoaderCalled('api/a.scenario.js');
      expectScenarioSelected(fulfilledSpy, 'single', 'api/a.scenario.js');
    });
  });

  it("should automatically run a single available scenario with custom options", function() {

    setScenarios('api/b.scenario.js');
    setLoadedScenario('single with custom options');

    var fulfilledSpy = select(true, { foo: 'bar' });

    runs(function() {
      expectListingDisplayed(false, { foo: 'bar' });
      expectReadlineCalled(false);
      expectLoaderCalled('api/b.scenario.js');
      expectScenarioSelected(fulfilledSpy, 'single with custom options', 'api/b.scenario.js');
    });
  });

  describe("with a provided argument", function() {

    beforeEach(function() {
      setScenarios('api/a.scenario.js', 'api/b.scenario.js', 'api/c.scenario.js', 'api/sub/d.scenario.js');
    });

    it("should run a scenario by number", function() {

      setChoice('2');
      setLoadedScenario('by number');

      var fulfilledSpy = select();

      runs(function() {
        expectListingDisplayed(false);
        expectReadlineCalled(false);
        expectLoaderCalled('api/b.scenario.js');
        expectScenarioSelected(fulfilledSpy, 'by number', 'api/b.scenario.js');
      });
    });

    it("should run a scenario by path", function() {

      setChoice('api/c.scenario.js');
      setLoadedScenario('by path');

      var fulfilledSpy = select();

      runs(function() {
        expectListingDisplayed(false);
        expectReadlineCalled(false);
        expectLoaderCalled('api/c.scenario.js');
        expectScenarioSelected(fulfilledSpy, 'by path', 'api/c.scenario.js');
      });
    });

    it("should run a scenario by name", function() {

      setChoice('a');
      setLoadedScenario('by name');

      var fulfilledSpy = select();

      runs(function() {
        expectListingDisplayed(false);
        expectReadlineCalled(false);
        expectLoaderCalled('api/a.scenario.js');
        expectScenarioSelected(fulfilledSpy, 'by name', 'api/a.scenario.js');
      });
    });

    it("should run a scenario with custom options", function() {

      setChoice('d');
      setLoadedScenario('by name with custom options');

      var fulfilledSpy = select(true, { baz: 'qux' });

      runs(function() {
        expectListingDisplayed(false, { baz: 'qux' });
        expectReadlineCalled(false);
        expectLoaderCalled('api/sub/d.scenario.js');
        expectScenarioSelected(fulfilledSpy, 'by name with custom options', 'api/sub/d.scenario.js');
      });
    });

    it("should run a scenario in a sub-directory by name", function() {

      setChoice('d');
      setLoadedScenario('by name in subdir');

      var fulfilledSpy = select();

      runs(function() {
        expectListingDisplayed(false);
        expectReadlineCalled(false);
        expectLoaderCalled('api/sub/d.scenario.js');
        expectScenarioSelected(fulfilledSpy, 'by name in subdir', 'api/sub/d.scenario.js');
      });
    });

    it("should display available scenarios and not run anything if no matching scenario is found", function() {

      setChoice('unknown');

      var rejectedSpy = select(false);

      runs(function() {
        expectListingDisplayed(true);
        expectReadlineCalled(false);
        expectLoaderCalled(false);
        expectError(rejectedSpy, 'No such scenario "unknown"');
      });
    });

    it("should display available scenarios and not run anything if the scenario number is 0", function() {

      setChoice('0');

      var rejectedSpy = select(false);

      runs(function() {
        expectListingDisplayed(true);
        expectReadlineCalled(false);
        expectLoaderCalled(false);
        expectError(rejectedSpy, 'No such scenario "0"');
      });
    });

    it("should display available scenarios and not run anything if the scenario number is out of bounds", function() {

      setChoice('5');

      var rejectedSpy = select(false);

      runs(function() {
        expectListingDisplayed(true);
        expectReadlineCalled(false);
        expectLoaderCalled(false);
        expectError(rejectedSpy, 'No such scenario "5"');
      });
    });
  });

  describe("after asking the user which scenario to run", function() {

    beforeEach(function() {
      setScenarios('api/a.scenario.js', 'api/b.scenario.js', 'api/c.scenario.js', 'api/sub/d.scenario.js');
    });

    it("should run a scenario by number", function() {

      setReadlineAnswer('2');
      setLoadedScenario('by number');

      var fulfilledSpy = select();

      runs(function() {
        expectListingDisplayed(true);
        expectReadlineCalled(true);
        expectLoaderCalled('api/b.scenario.js');
        expectScenarioSelected(fulfilledSpy, 'by number', 'api/b.scenario.js');
      });
    });

    it("should run a scenario by path", function() {

      setReadlineAnswer('api/c.scenario.js');
      setLoadedScenario('by path');

      var fulfilledSpy = select();

      runs(function() {
        expectListingDisplayed(true);
        expectReadlineCalled(true);
        expectLoaderCalled('api/c.scenario.js');
        expectScenarioSelected(fulfilledSpy, 'by path', 'api/c.scenario.js');
      });
    });

    it("should run a scenario by name", function() {

      setReadlineAnswer('a');
      setLoadedScenario('by name');

      var fulfilledSpy = select();

      runs(function() {
        expectListingDisplayed(true);
        expectReadlineCalled(true);
        expectLoaderCalled('api/a.scenario.js');
        expectScenarioSelected(fulfilledSpy, 'by name', 'api/a.scenario.js');
      });
    });

    it("should run a scenario with custom options", function() {

      setReadlineAnswer('d');
      setLoadedScenario('by name with custom options');

      var fulfilledSpy = select(true, { qux: 'baz' });

      runs(function() {
        expectListingDisplayed(true, { qux: 'baz' });
        expectReadlineCalled(true);
        expectLoaderCalled('api/sub/d.scenario.js');
        expectScenarioSelected(fulfilledSpy, 'by name with custom options', 'api/sub/d.scenario.js');
      });
    });

    it("should not run anything if the user gives no answer", function() {

      setReadlineAnswer('');

      var rejectedSpy = select(false);

      runs(function() {
        expectListingDisplayed(true);
        expectReadlineCalled(true);
        expectLoaderCalled(false);
        expectError(rejectedSpy, 'No such scenario ""');
      });
    });

    it("should not run anything if the user gives 0 as the answer", function() {

      setReadlineAnswer('0');

      var rejectedSpy = select(false);

      runs(function() {
        expectListingDisplayed(true);
        expectReadlineCalled(true);
        expectLoaderCalled(false);
        expectError(rejectedSpy, 'No such scenario "0"');
      });
    });

    it("should not run anything if the user gives a scenario number that is out of bounds", function() {

      setReadlineAnswer('5');

      var rejectedSpy = select(false);

      runs(function() {
        expectListingDisplayed(true);
        expectReadlineCalled(true);
        expectLoaderCalled(false);
        expectError(rejectedSpy, 'No such scenario "5"');
      });
    });

    it("should not run anything if the user gives an invalid answer", function() {

      setReadlineAnswer('unknown');

      var rejectedSpy = select(false);

      runs(function() {
        expectListingDisplayed(true);
        expectReadlineCalled(true);
        expectLoaderCalled(false);
        expectError(rejectedSpy, 'No such scenario "unknown"');
      });
    });
  });

  function expectListingDisplayed(displayed, options) {

    // check that one logger was created with the correct options
    expect(CliListingMock.instances.length).toBe(1);
    expect(CliListingMock.instances[0].args).toEqual([ _.extend({}, options) ]);

    // check that the logger was called (or not)
    displayed = displayed !== undefined ? displayed : true;
    if (displayed) {
      expect(CliListingMock.instances[0].display).toHaveBeenCalledWith(scenarios);
    } else {
      expect(CliListingMock.instances[0].display).not.toHaveBeenCalled();
    }
  }

  function expectLoaderCalled(file) {
    if (file) {
      expect(mocks.loader).toHaveBeenCalledWith(path.resolve(file));
    } else {
      expect(mocks.loader).not.toHaveBeenCalled();
    }
  }

  function expectReadlineCalled(called) {

    if (!called || called === undefined) {
      expect(mocks.readline.createInterface).not.toHaveBeenCalled();
      return;
    }

    // check that a readline interface was created
    expect(mocks.readline.createInterface).toHaveBeenCalledWith({
      input: process.stdin,
      output: process.stdout
    });

    // check that the readline interface was used to ask the user which scenario to run
    var rl = mocks.readlineInterface;
    expect(rl.question).toHaveBeenCalled();
    expect(rl.question.calls[0].args[0]).toBe('\nType the number of the scenario you want to run: ');

    // check that the readline interface was closed
    expect(rl.close).toHaveBeenCalled();
  }

  function expectScenarioSelected(fulfilledSpy, result, file) {
    if (result === undefined) {
      expect(fulfilledSpy).toHaveBeenCalledWith(undefined);
    } else {
      expect(fulfilledSpy).toHaveBeenCalledWith({ result: result, file: file });
    }
  }

  function expectError(rejectedSpy, message) {
    expect(rejectedSpy).toHaveBeenCalled();
    expect(rejectedSpy.calls[0].args[0]).toBeAnError(message);
  }
});
