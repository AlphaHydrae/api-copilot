var _ = require('underscore'),
    h = require('./support/helpers'),
    path = require('path'),
    slice = Array.prototype.slice;

describe("CLI Selector", function() {

  var scenarioFinderUtils = require('./support/scenario.finder.utils'),
      cliSelectorInjector = require('../lib/cli.selector');

  var selector, mocks, loadedScenario, readlineAnswer, foundScenarios, scenarioListing, choice, lines;
  beforeEach(function() {

    h.addMatchers(this);

    lines = [];
    choice = undefined;
    foundScenarios = undefined;
    loadedScenario = undefined;
    readlineAnswer = undefined;
    scenarioListing = 'scenario\nlisting';

    mocks = {
      scenarioListing: function() {
        if (scenarioListing instanceof Error) {
          throw scenarioListing;
        }

        return scenarioListing;
      },
      scenarioLoader: function() {
        if (loadedScenario instanceof Error) {
          throw loadedScenario;
        }

        return loadedScenario;
      },
      print: function(text) {
        lines = lines.concat((text || '').split("\n"));
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

    spyOn(mocks, 'scenarioListing').andCallThrough();
    spyOn(mocks, 'scenarioLoader').andCallThrough();
    spyOn(mocks.readlineInterface, 'question').andCallThrough();
    spyOn(mocks.readlineInterface, 'close');
    spyOn(mocks.readline, 'createInterface').andCallThrough();

    selector = cliSelectorInjector(mocks);
  });

  function select(expectedResult, options) {
    if (!foundScenarios) {
      throw new Error('No scenarios mocked');
    }

    var promise = selector(foundScenarios, choice, _.extend({}, options));
    return h.runPromise(promise, expectedResult);
  }

  function setAvailableScenarios() {
    foundScenarios = scenarioFinderUtils.parseFiles(slice.call(arguments));
  }

  function setChoice(newChoice) {
    choice = newChoice;
  }

  function setLoadedScenario(scenario) {
    loadedScenario = scenario instanceof Error ? scenario : { result: scenario };
  }

  function setReadlineAnswer(answer) {
    readlineAnswer = answer;
  }

  function setScenarioListing(listing) {
    scenarioListing = listing;
  }

  it("should select nothing if there are no available scenarios", function() {

    setAvailableScenarios();

    var fulfilledSpy = select();

    runs(function() {
      expectListingPrinted();
      expectReadlineCalled(false);
      expectLoaderCalled(false);
      expectScenarioSelected(fulfilledSpy, undefined);
    });
  });

  it("should automatically select a single available scenario", function() {

    setAvailableScenarios('api/a.scenario.js');
    setLoadedScenario('single');

    var fulfilledSpy = select();

    runs(function() {
      expectListingPrinted(false);
      expectReadlineCalled(false);
      expectLoaderCalled('api/a.scenario.js');
      expectScenarioSelected(fulfilledSpy, 'single', 'api/a.scenario.js');
    });
  });

  it("should automatically select a single available scenario with custom options", function() {

    setAvailableScenarios('api/b.scenario.js');
    setLoadedScenario('single with custom options');

    var fulfilledSpy = select(true, { foo: 'bar' });

    runs(function() {
      expectListingPrinted(false);
      expectReadlineCalled(false);
      expectLoaderCalled('api/b.scenario.js');
      expectScenarioSelected(fulfilledSpy, 'single with custom options', 'api/b.scenario.js');
    });
  });

  describe("with a provided argument", function() {

    beforeEach(function() {
      setAvailableScenarios('api/a.scenario.js', 'api/b.scenario.js', 'api/c.scenario.js', 'api/sub/d.scenario.js');
    });

    it("should run a scenario by number", function() {

      setChoice('2');
      setLoadedScenario('by number');

      var fulfilledSpy = select();

      runs(function() {
        expectListingPrinted(false);
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
        expectListingPrinted(false);
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
        expectListingPrinted(false);
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
        expectListingPrinted(false);
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
        expectListingPrinted(false);
        expectReadlineCalled(false);
        expectLoaderCalled('api/sub/d.scenario.js');
        expectScenarioSelected(fulfilledSpy, 'by name in subdir', 'api/sub/d.scenario.js');
      });
    });

    it("should display available scenarios and not run anything if no matching scenario is found", function() {

      setChoice('unknown');

      var rejectedSpy = select(false);

      runs(function() {
        expectListingPrinted();
        expectReadlineCalled(false);
        expectLoaderCalled(false);
        expectError(rejectedSpy, 'No such scenario "unknown"');
      });
    });

    it("should display available scenarios and not run anything if the scenario number is 0", function() {

      setChoice('0');

      var rejectedSpy = select(false);

      runs(function() {
        expectListingPrinted();
        expectReadlineCalled(false);
        expectLoaderCalled(false);
        expectError(rejectedSpy, 'No such scenario "0"');
      });
    });

    it("should display available scenarios and not run anything if the scenario number is out of bounds", function() {

      setChoice('5');

      var rejectedSpy = select(false);

      runs(function() {
        expectListingPrinted();
        expectReadlineCalled(false);
        expectLoaderCalled(false);
        expectError(rejectedSpy, 'No such scenario "5"');
      });
    });

    it("should not display available scenarios and not run anything if a loading error occurs", function() {

      setChoice('a');
      setLoadedScenario(new Error('loading bug'));

      var rejectedSpy = select(false);

      runs(function() {
        expectListingPrinted(false);
        expectReadlineCalled(false);
        expectLoaderCalled('api/a.scenario.js');
        expectError(rejectedSpy, 'loading bug');
      });
    });
  });

  describe("after asking the user which scenario to run", function() {

    beforeEach(function() {
      setAvailableScenarios('api/a.scenario.js', 'api/b.scenario.js', 'api/c.scenario.js', 'api/sub/d.scenario.js');
    });

    it("should run a scenario by number", function() {

      setReadlineAnswer('2');
      setLoadedScenario('by number');

      var fulfilledSpy = select();

      runs(function() {
        expectListingPrinted();
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
        expectListingPrinted();
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
        expectListingPrinted();
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
        expectListingPrinted({ qux: 'baz' });
        expectReadlineCalled(true);
        expectLoaderCalled('api/sub/d.scenario.js');
        expectScenarioSelected(fulfilledSpy, 'by name with custom options', 'api/sub/d.scenario.js');
      });
    });

    it("should not run anything if the user gives no answer", function() {

      setReadlineAnswer('');

      var rejectedSpy = select(false);

      runs(function() {
        expectListingPrinted();
        expectReadlineCalled(true);
        expectLoaderCalled(false);
        expectError(rejectedSpy, 'No such scenario ""');
      });
    });

    it("should not run anything if the user gives 0 as the answer", function() {

      setReadlineAnswer('0');

      var rejectedSpy = select(false);

      runs(function() {
        expectListingPrinted();
        expectReadlineCalled(true);
        expectLoaderCalled(false);
        expectError(rejectedSpy, 'No such scenario "0"');
      });
    });

    it("should not run anything if the user gives a scenario number that is out of bounds", function() {

      setReadlineAnswer('5');

      var rejectedSpy = select(false);

      runs(function() {
        expectListingPrinted();
        expectReadlineCalled(true);
        expectLoaderCalled(false);
        expectError(rejectedSpy, 'No such scenario "5"');
      });
    });

    it("should not run anything if the user gives an invalid answer", function() {

      setReadlineAnswer('unknown');

      var rejectedSpy = select(false);

      runs(function() {
        expectListingPrinted();
        expectReadlineCalled(true);
        expectLoaderCalled(false);
        expectError(rejectedSpy, 'No such scenario "unknown"');
      });
    });
  });
  
  describe("completer function", function() {

    var completer;
    beforeEach(function() {

      setAvailableScenarios('api/abc.scenario.js', 'api/abcdef.scenario.js', 'api/fedcab.scenario.js', 'api/sub/ab.scenario.js');
      setReadlineAnswer('2');
      setLoadedScenario('completer');

      var fulfilledSpy = select();

      runs(function() {

        expectListingPrinted();
        expectReadlineCalled(true);
        expectLoaderCalled('api/abcdef.scenario.js');
        expectScenarioSelected(fulfilledSpy, 'completer', 'api/abcdef.scenario.js');

        completer = mocks.readline.createInterface.calls[0].args[0].completer;
      });
    });

    it("should find all scenarios with no input", function() {
      expect(completer('')).toEqual([ [ 'abc', 'abcdef', 'fedcab', 'ab' ], '' ]);
    });

    it("should find scenarios that have names starting with the input token", function() {
      expect(completer('a')).toEqual([ [ 'abc', 'abcdef', 'ab' ], 'a' ]);
    });
  });

  function expectListingPrinted(options) {
    if (options === false) {
      expect(mocks.scenarioListing).not.toHaveBeenCalled();
      expect(lines).toEqual([]);
    } else {
      expect(mocks.scenarioListing).toHaveBeenCalledWith(foundScenarios, _.extend({}, options));
      expect(lines).toEqual([ '' ].concat(scenarioListing.split("\n")));
    }
  }

  function expectLoaderCalled(file) {
    if (file) {
      expect(mocks.scenarioLoader).toHaveBeenCalledWith(path.resolve(file));
    } else {
      expect(mocks.scenarioLoader).not.toHaveBeenCalled();
    }
  }

  function expectReadlineCalled(called) {

    if (!called) {
      expect(mocks.readline.createInterface).not.toHaveBeenCalled();
      return;
    }

    // check that a readline interface was created
    expect(mocks.readline.createInterface).toHaveBeenCalledWith({
      input: process.stdin,
      output: process.stdout,
      completer: jasmine.any(Function)
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
