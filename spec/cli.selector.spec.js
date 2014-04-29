var _ = require('underscore'),
    h = require('./support/helpers'),
    path = require('path'),
    slice = Array.prototype.slice;

describe("CLI Selector", function() {

  var CliListingMock = require('./support/cli.listing.mock'),
      ReadlineMock = require('./support/readline.mock'),
      ScenarioFinderMock = require('./support/scenario.finder.mock'),
      ScenarioLoaderMock = require('./support/scenario.loader.mock'),
      cliSelectorInjector = require('../lib/cli.selector');

  var selector, listingMock, readlineMock, loaderMock, scenarios, choice;
  beforeEach(function() {

    h.addMatchers(this);

    readlineMock = new ReadlineMock();
    loaderMock = new ScenarioLoaderMock();
    CliListingMock.instances.length = 0;

    choice = undefined;
    scenarios = undefined;

    selector = cliSelectorInjector({
      readline: readlineMock,
      scenarioLoader: loaderMock.loader,
      Listing: CliListingMock
    });
  });

  function select(spy, expectedResult, options) {
    if (!scenarios) {
      throw new Error('No scenarios mocked');
    }

    expectedResult = expectedResult !== undefined ? expectedResult : true;

    runs(function() {
      selector(scenarios, choice, _.extend({}, options))[expectedResult ? 'then' : 'fail'](spy);
    });

    waitsFor(function() {
      return spy.calls.length;
    }, "the selector to have finished selecting", 50);
  }

  function setScenarios() {
    scenarios = ScenarioFinderMock.parseFiles(slice.call(arguments));
  }

  function setChoice(newChoice) {
    choice = newChoice;
  }

  function setLoadedScenario(scenario) {
    loaderMock.addResult(scenario);
  }

  describe("with a scenario argument", function() {

    var files;
    beforeEach(function() {
      setScenarios('api/a.scenario.js', 'api/b.scenario.js', 'api/c.scenario.js', 'api/sub/d.scenario.js');
    });

    it("should run a scenario by number", function() {

      setChoice('2');
      setLoadedScenario('by number');

      var fulfilledSpy = jasmine.createSpy();
      select(fulfilledSpy);

      runs(function() {
        expectListingDisplayed(false);
        expectLoaderCalled('api/b.scenario.js');
        expectedScenarioSelected(fulfilledSpy, 'by number');
      });
    });

    it("should run a scenario by path", function() {

      setChoice('api/c.scenario.js');
      setLoadedScenario('by path');

      var fulfilledSpy = jasmine.createSpy();
      select(fulfilledSpy);

      runs(function() {
        expectListingDisplayed(false);
        expectLoaderCalled('api/c.scenario.js');
        expectedScenarioSelected(fulfilledSpy, 'by path');
      });
    });

    it("should run a scenario by name", function() {

      setChoice('a');
      setLoadedScenario('by name');

      var fulfilledSpy = jasmine.createSpy();
      select(fulfilledSpy);

      runs(function() {
        expectListingDisplayed(false);
        expectLoaderCalled('api/a.scenario.js');
        expectedScenarioSelected(fulfilledSpy, 'by name');
      });
    });

    it("should run a scenario with custom options", function() {

      setChoice('d');
      setLoadedScenario('by name with custom options');

      var fulfilledSpy = jasmine.createSpy();
      select(fulfilledSpy, true, { baz: 'qux' });

      runs(function() {
        expectListingDisplayed(false, { baz: 'qux' });
        expectLoaderCalled('api/sub/d.scenario.js');
        expectedScenarioSelected(fulfilledSpy, 'by name with custom options');
      });
    });

    it("should run a scenario in a sub-directory by name", function() {

      setChoice('d');
      setLoadedScenario('by name in subdir');

      var fulfilledSpy = jasmine.createSpy();
      select(fulfilledSpy);

      runs(function() {
        expectListingDisplayed(false);
        expectLoaderCalled('api/sub/d.scenario.js');
        expectedScenarioSelected(fulfilledSpy, 'by name in subdir');
      });
    });

    it("should display available scenarios and not run anything if no matching scenario is found", function() {

      setChoice('unknown');

      var rejectedSpy = jasmine.createSpy();
      select(rejectedSpy, false);

      runs(function() {
        expectListingDisplayed(true);
        expectLoaderCalled(false);
        expectError(rejectedSpy, 'No such scenario "unknown"');
      });
    });

    it("should display available scenarios and not run anything if the scenario number is 0", function() {

      setChoice('0');

      var rejectedSpy = jasmine.createSpy();
      select(rejectedSpy, false);

      runs(function() {
        expectListingDisplayed(true);
        expectLoaderCalled(false);
        expectError(rejectedSpy, 'No such scenario "0"');
      });
    });

    it("should display available scenarios and not run anything if the scenario number is out of bounds", function() {

      setChoice('5');

      var rejectedSpy = jasmine.createSpy();
      select(rejectedSpy, false);

      runs(function() {
        expectListingDisplayed(true);
        expectLoaderCalled(false);
        expectError(rejectedSpy, 'No such scenario "5"');
      });
    });
  });

  /*describe("without a scenario argument", function() {

    var files, filesPre;
    beforeEach(function() {
      files = [ 'api/a.scenario.js', 'api/b.scenario.js', 'api/c.scenario.js', 'api/sub/d.scenario.js' ];
      filesPre = setListingFiles.apply(undefined, files);
    });

    it("should run a scenario by number", function() {

      setScenario('number arg');
      readlineMock.addAnswer('2');

      var fulfilledSpy = jasmine.createSpy();
      h.runPromise(run({}, { pre: filesPre }), fulfilledSpy);

      runs(function() {
        expectScenarioSelectedByUser();
        expectedScenarioSelected(fulfilledSpy, 'api/b.scenario.js', 'number arg');
      });
    });

    it("should run a scenario by path", function() {

      setScenario('path arg');
      readlineMock.addAnswer('api/c.scenario.js');

      var fulfilledSpy = jasmine.createSpy();
      h.runPromise(run({}, { pre: filesPre }), fulfilledSpy);

      runs(function() {
        expectScenarioSelectedByUser();
        expectedScenarioSelected(fulfilledSpy, 'api/c.scenario.js', 'path arg');
      });
    });

    it("should run a scenario by name", function() {

      setScenario('name arg');
      readlineMock.addAnswer('a');

      var fulfilledSpy = jasmine.createSpy();
      h.runPromise(run({}, { pre: filesPre }), fulfilledSpy);

      runs(function() {
        expectScenarioSelectedByUser();
        expectedScenarioSelected(fulfilledSpy, 'api/a.scenario.js', 'name arg');
      });
    });

    it("should run a scenario with custom options", function() {

      setScenario('name arg with custom options');
      readlineMock.addAnswer('d');

      var fulfilledSpy = jasmine.createSpy();
      h.runPromise(run({ qux: 'baz' }, { pre: filesPre }), fulfilledSpy);

      runs(function() {
        expectScenarioSelectedByUser();
        expectedScenarioSelected(fulfilledSpy, 'api/sub/d.scenario.js', 'name arg with custom options', { qux: 'baz' });
      });
    });

    it("should not run anything if the user gives no answer", function() {

      readlineMock.addAnswer('');

      var rejectedSpy = jasmine.createSpy();
      h.runPromise(run({}, { expectedResult: false, pre: filesPre }), rejectedSpy, false);

      runs(function() {
        expectScenarioSelectedByUser();
        expectNoScenarioCalled();
        expectRunError(rejectedSpy, 'No such scenario ""');
      });
    });

    it("should not run anything if the user gives 0 as the answer", function() {

      readlineMock.addAnswer('0');

      var rejectedSpy = jasmine.createSpy();
      h.runPromise(run({}, { expectedResult: false, pre: filesPre }), rejectedSpy, false);

      runs(function() {
        expectScenarioSelectedByUser();
        expectNoScenarioCalled();
        expectRunError(rejectedSpy, 'No such scenario "0"');
      });
    });

    it("should not run anything if the user gives a scenario number that is out of bounds", function() {

      readlineMock.addAnswer('5');

      var rejectedSpy = jasmine.createSpy();
      h.runPromise(run({}, { expectedResult: false, pre: filesPre }), rejectedSpy, false);

      runs(function() {
        expectScenarioSelectedByUser();
        expectNoScenarioCalled();
        expectRunError(rejectedSpy, 'No such scenario "5"');
      });
    });

    it("should not run anything if the user gives an invalid answer", function() {

      readlineMock.addAnswer('unknown');

      var rejectedSpy = jasmine.createSpy();
      h.runPromise(run({}, { expectedResult: false, pre: filesPre }), rejectedSpy, false);

      runs(function() {
        expectScenarioSelectedByUser();
        expectNoScenarioCalled();
        expectRunError(rejectedSpy, 'No such scenario "unknown"');
      });
    });
  });*/

  function expectListingDisplayed(displayed, options) {

    expect(CliListingMock.instances.length).toBe(1);
    expect(CliListingMock.instances[0].args).toEqual([ _.extend({}, options) ]);

    displayed = displayed !== undefined ? displayed : true;
    if (displayed) {
      expect(CliListingMock.instances[0].display).toHaveBeenCalledWith(scenarios);
    } else {
      expect(CliListingMock.instances[0].display).not.toHaveBeenCalled();
    }
  }

  function expectLoaderCalled(file) {
    if (file) {
      expect(loaderMock.loader).toHaveBeenCalledWith(path.resolve(file));
    } else {
      expect(loaderMock.loader).not.toHaveBeenCalled();
    }
  }

  function expectedScenarioSelected(fulfilledSpy, result) {
    expect(fulfilledSpy).toHaveBeenCalledWith(result);
  }

  function expectError(rejectedSpy, message) {
    expect(rejectedSpy).toHaveBeenCalled();
    expect(rejectedSpy.calls[0].args[0]).toBeAnError(message);
  }

  function expectScenarioSelectedByUser() {

    // check that a readline interface was created
    expect(readlineMock.interfaces.length).toBe(1);
    expect(readlineMock.createInterface).toHaveBeenCalledWith({
      input: process.stdin,
      output: process.stdout
    });

    // check that the readline interface was used to ask the user which scenario to run
    var rl = readlineMock.getLatestInterface();
    expect(rl.question).toHaveBeenCalled();
    expect(rl.question.calls[0].args[0]).toBe('Type the number of the scenario you want to run: ');

    // check that the readline interface was closed
    expect(rl.close).toHaveBeenCalled();
  }
});
