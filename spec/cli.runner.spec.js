var _ = require('underscore'),
    colors = require('colors'),
    fs = require('fs'),
    h = require('./support/helpers'),
    q = require('q'),
    path = require('path'),
    slice = Array.prototype.slice;

describe("CLI Runner", function() {

  var CliLoggerMock = require('./support/cli.logger.mock'),
      ListingMock = require('./support/listing.mock'),
      ReadlineMock = require('./support/readline.mock'),
      runnerInjector = require('../lib/cli.runner');

  var scenario = null,
      scenarioLoaderData = {},
      scenarioLoaded = false,
      loadedScenarioFile = null,
      scenarioLoader = function(file) {
        if (!scenarioLoaderData.scenario) {
          throw new Error('No mock scenario was defined');
        } else if (scenarioLoaded) {
          throw new Error('A scenario was already loaded');
        }

        scenarioLoaded = true;
        loadedScenarioFile = file;
        return scenarioLoaderData.scenario;
      };

  var Runner, readlineMock;
  beforeEach(function() {

    h.addMatchers(this);

    readlineMock = new ReadlineMock();
    CliLoggerMock.instances.length = 0;

    scenario = null;
    scenarioLoaded = false;
    loadedScenarioFile = null;
    delete scenarioLoaderData.scenario;

    Runner = runnerInjector({
      Logger: CliLoggerMock,
      Listing: ListingMock,
      readline: readlineMock,
      scenarioLoader: scenarioLoader
    });
  });

  var runner, listing, output, defaultOptions;
  function run(options, runOptions) {

    runOptions = _.isObject(runOptions) ? _.extend({ expectedResult: true }, runOptions) : {
      expectedResult: runOptions !== undefined ? runOptions : true
    };

    defaultOptions = { source: 'api', foo: 'bar' };
    runner = new Runner(_.extend({}, defaultOptions, options));
    listing = runner.listing;

    if (runOptions.pre) {
      runOptions.pre();
    }

    var deferred = q.defer(),
        runArguments = slice.call(arguments, 2);

    var promise, result;
    runs(function() {

      output = h.capture(function() {
        promise = runner.execute.apply(runner, runArguments);
      });

      promise.then(function(runResult) {
        result = true;
        deferred.resolve(runResult);
      }, function(err) {
        result = false;
        deferred.reject(err);
      });
    });

    waitsFor(function() {
      return result !== undefined;
    }, "the runner to have finished running", 50);

    runs(function() {
      expect(result).toBe(runOptions.expectedResult);
    });

    return deferred.promise;
  }

  function setScenario(result) {

    scenario = {
      run: function() {
        return result instanceof Error ? q.reject(result) : q(result);
      }
    };

    spyOn(scenario, 'run').andCallThrough();

    scenarioLoaderData.scenario = scenario;
  }

  function setListingFiles() {
    var files = slice.call(arguments);
    return function() {
      listing.setFiles(files);
    };
  }

  it("should display the listing if there are no available scenarios", function() {

    var fulfilledSpy = jasmine.createSpy();
    h.runPromise(run(), fulfilledSpy);

    runs(function() {
      expect(fulfilledSpy).toHaveBeenCalledWith(undefined);
      expect(runner.listing.display).toHaveBeenCalledWith([]);
      expect(loadedScenarioFile).toBe(null);
    });
  });

  it("should automatically run a single available scenario", function() {

    setScenario('single');

    var fulfilledSpy = jasmine.createSpy();
    h.runPromise(run({}, { pre: setListingFiles('api/a.scenario.js') }), fulfilledSpy);

    runs(function() {
      expectScenarioCalled(fulfilledSpy, 'api/a.scenario.js', 'single');
    });
  });

  it("should automatically run a single available scenario with custom options", function() {

    setScenario('single');

    var fulfilledSpy = jasmine.createSpy();
    h.runPromise(run({ baz: 'qux', corge: 'grault' }, { pre: setListingFiles('api/a.scenario.js') }), fulfilledSpy);

    runs(function() {
      expectScenarioCalled(fulfilledSpy, 'api/a.scenario.js', 'single', { baz: 'qux', corge: 'grault' });
    });
  });

  describe("with a scenario argument", function() {

    var files, filesPre;
    beforeEach(function() {
      files = [ 'api/a.scenario.js', 'api/b.scenario.js', 'api/c.scenario.js', 'api/sub/d.scenario.js' ];
      filesPre = setListingFiles.apply(undefined, files);
    });

    it("should run a scenario by number", function() {

      setScenario('number arg');

      var fulfilledSpy = jasmine.createSpy();
      h.runPromise(run({}, { pre: filesPre }, '2'), fulfilledSpy);

      runs(function() {
        expect(listing.display).not.toHaveBeenCalled();
        expectScenarioCalled(fulfilledSpy, 'api/b.scenario.js', 'number arg');
      });
    });

    it("should run a scenario by path", function() {

      setScenario('path arg');

      var fulfilledSpy = jasmine.createSpy();
      h.runPromise(run({}, { pre: filesPre }, 'api/c.scenario.js'), fulfilledSpy);

      runs(function() {
        expect(listing.display).not.toHaveBeenCalled();
        expectScenarioCalled(fulfilledSpy, 'api/c.scenario.js', 'path arg');
      });
    });

    it("should run a scenario by name", function() {

      setScenario('name arg');

      var fulfilledSpy = jasmine.createSpy();
      h.runPromise(run({}, { pre: filesPre }, 'a'), fulfilledSpy);

      runs(function() {
        expect(listing.display).not.toHaveBeenCalled();
        expectScenarioCalled(fulfilledSpy, 'api/a.scenario.js', 'name arg');
      });
    });

    it("should run a scenario with custom options", function() {

      setScenario('name arg with custom options');

      var fulfilledSpy = jasmine.createSpy();
      h.runPromise(run({ baz: 'qux' }, { pre: filesPre }, 'd'), fulfilledSpy);

      runs(function() {
        expect(listing.display).not.toHaveBeenCalled();
        expectScenarioCalled(fulfilledSpy, 'api/sub/d.scenario.js', 'name arg with custom options', { baz: 'qux' });
      });
    });

    it("should run a scenario in a sub-directory by name", function() {

      setScenario('name arg sub');

      var fulfilledSpy = jasmine.createSpy();
      h.runPromise(run({}, { pre: filesPre }, 'd'), fulfilledSpy);

      runs(function() {
        expect(listing.display).not.toHaveBeenCalled();
        expectScenarioCalled(fulfilledSpy, 'api/sub/d.scenario.js', 'name arg sub');
      });
    });

    it("should display available scenarios and not run anything if no matching scenario is found", function() {

      setScenario('unknown arg');

      var rejectedSpy = jasmine.createSpy();
      h.runPromise(run({}, { expectedResult: false, pre: filesPre }, 'unknown'), rejectedSpy, false);

      runs(function() {
        expectNoScenarioCalled();
        expectRunError(rejectedSpy, 'No such scenario "unknown"');
      });
    });

    it("should display available scenarios and not run anything if the scenario number is 0", function() {

      setScenario('zero arg');

      var rejectedSpy = jasmine.createSpy();
      h.runPromise(run({}, { expectedResult: false, pre: filesPre }, '0'), rejectedSpy, false);

      runs(function() {
        expectNoScenarioCalled();
        expectRunError(rejectedSpy, 'No such scenario "0"');
      });
    });

    it("should display available scenarios and not run anything if the scenario number is out of bounds", function() {

      setScenario('out of bounds arg');

      var rejectedSpy = jasmine.createSpy();
      h.runPromise(run({}, { expectedResult: false, pre: filesPre }, '5'), rejectedSpy, false);

      runs(function() {
        expectNoScenarioCalled();
        expectRunError(rejectedSpy, 'No such scenario "5"');
      });
    });
  });

  describe("without a scenario argument", function() {

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
        expectScenarioCalled(fulfilledSpy, 'api/b.scenario.js', 'number arg');
      });
    });

    it("should run a scenario by path", function() {

      setScenario('path arg');
      readlineMock.addAnswer('api/c.scenario.js');

      var fulfilledSpy = jasmine.createSpy();
      h.runPromise(run({}, { pre: filesPre }), fulfilledSpy);

      runs(function() {
        expectScenarioSelectedByUser();
        expectScenarioCalled(fulfilledSpy, 'api/c.scenario.js', 'path arg');
      });
    });

    it("should run a scenario by name", function() {

      setScenario('name arg');
      readlineMock.addAnswer('a');

      var fulfilledSpy = jasmine.createSpy();
      h.runPromise(run({}, { pre: filesPre }), fulfilledSpy);

      runs(function() {
        expectScenarioSelectedByUser();
        expectScenarioCalled(fulfilledSpy, 'api/a.scenario.js', 'name arg');
      });
    });

    it("should run a scenario with custom options", function() {

      setScenario('name arg with custom options');
      readlineMock.addAnswer('d');

      var fulfilledSpy = jasmine.createSpy();
      h.runPromise(run({ qux: 'baz' }, { pre: filesPre }), fulfilledSpy);

      runs(function() {
        expectScenarioSelectedByUser();
        expectScenarioCalled(fulfilledSpy, 'api/sub/d.scenario.js', 'name arg with custom options', { qux: 'baz' });
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
  });

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

  function expectRunError(rejectedSpy, message) {

    // check that the error message was logged
    expect(output.stderr.trim()).toBe(message.yellow);

    // check that the returned promise was rejected with the error
    expect(rejectedSpy).toHaveBeenCalled();
    expect(rejectedSpy.calls[0].args[0]).toBeAnError(message);
  }

  function expectScenarioCalled(fulfilledSpy, file, result, options) {

    // check that the correct scenario file was loaded
    expect(loadedScenarioFile).toBe(path.resolve(file));

    // check that a logger was instantiated with the scenario as argument
    expect(CliLoggerMock.instances.length).toBe(1);
    expect(CliLoggerMock.instances[0].args).toEqual([ scenario ]);

    // check that the scenario was called with the correct options
    expect(scenario.run).toHaveBeenCalledWith(_.extend({}, defaultOptions, options));

    // check that the runner and scenario finished running successfully
    expect(fulfilledSpy).toHaveBeenCalledWith(result);
  }

  function expectNoScenarioCalled() {

    // check that the listing of scenarios was displayed
    expect(listing.display).toHaveBeenCalledWith(listing.scenarios);

    // check that no scenario was loaded or called
    expect(loadedScenarioFile).toBe(null);
    if (scenario) {
      expect(scenario.run).not.toHaveBeenCalled();
    }
  }
});
