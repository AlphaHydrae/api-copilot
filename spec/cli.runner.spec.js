var _ = require('underscore'),
    fs = require('fs'),
    h = require('./support/helpers'),
    q = require('q'),
    slice = Array.prototype.slice;

describe("CLI Runner", function() {

  var CliLoggerMock = require('./support/cli.logger.mock'),
      ListingMock = require('./support/listing.mock'),
      ReadlineMock = require('./support/readline.mock'),
      runnerInjector = require('../lib/cli.runner');

  var scenarioLoaderData = {},
      scenarioLoader = function() {
        if (!scenarioLoaderData.scenario) {
          throw new Error('No mock scenario was defined');
        }

        return scenarioLoaderData.scenario;
      };

  var Runner, readlineMock;
  beforeEach(function() {

    readlineMock = new ReadlineMock();
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

    var deferred = q.defer();

    var promise, result;
    runs(function() {

      output = h.capture(function() {
        promise = runner.execute.apply(runner, slice.call(arguments, 2));
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

  var scenario;
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
    });
  });

  it("should automatically run a single available scenario", function() {

    setScenario('foo');

    var fulfilledSpy = jasmine.createSpy();
    h.runPromise(run({}, { pre: setListingFiles('api/a.scenario.js') }), fulfilledSpy);

    runs(function() {
      expect(fulfilledSpy).toHaveBeenCalledWith('foo');
      expect(listing.display).not.toHaveBeenCalled();
      expect(scenario.run).toHaveBeenCalledWith(defaultOptions);
    });
  });
});
