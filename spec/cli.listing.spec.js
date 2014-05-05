var _ = require('underscore'),
    colors = require('colors'),
    h = require('./support/helpers'),
    cliListingInjector = require('../lib/cli.listing'),
    path = require('path'),
    q = require('q'),
    scenarioFinderUtils = require('./support/scenario.finder.utils'),
    slice = Array.prototype.slice;

describe("CLI Listing", function() {

  var cliListing, mocks, foundScenarios, scenarioListing, defaultOptions, lines, lineIndex;
  beforeEach(function() {

    h.addMatchers(this);

    lines = [];
    lineIndex = 0;
    foundScenarios = undefined;
    scenarioListing = undefined;
    defaultOptions = { source: 'api' };

    mocks = {
      finder: function() {
        return foundScenarios instanceof Error ? q.reject(foundScenarios) : q(foundScenarios);
      },
      listing: function() {
        if (scenarioListing instanceof Error) {
          throw scenarioListing;
        }

        return scenarioListing;
      },
      print: function(text) {
        lines = lines.concat((text || '').split("\n"));
      }
    };

    spyOn(mocks, 'finder').andCallThrough();
    spyOn(mocks, 'listing').andCallThrough();

    cliListing = cliListingInjector(mocks);
  });

  function list(expectedResult, options) {
    var promise = cliListing(_.extend({}, defaultOptions, options));
    return h.runPromise(promise, expectedResult);
  }

  function setScenarioListing(scenarioListingText) {
    scenarioListing = scenarioListingText;
  }

  function setAvailableScenarios(err) {
    if (err instanceof Error) {
      foundScenarios = err;
    } else {
      foundScenarios = scenarioFinderUtils.parseFiles(slice.call(arguments));
    }
  }

  it("should print the scenario listing and commands notice", function() {

    setAvailableScenarios('api/a.scenario.js', 'api/b.scenario.js');
    setScenarioListing('- a\n- b');

    var fulfilledSpy = list();

    runs(function() {

      expectSuccess(fulfilledSpy);
      expectFinderCalled();
      expectListingCalled();

      expectScenarioListingPrinted('\n- a\n- b');
      expectCommandsNoticePrinted();
      expectNothingMorePrinted();
    });
  });

  it("should pass its options to the scenario finder and listing", function() {

    setAvailableScenarios('api/a.scenario.js', 'api/b.scenario.js');
    setScenarioListing('- a\n- b');

    var fulfilledSpy = list(true, { foo: 'bar', baz: 'qux' });

    runs(function() {

      expectSuccess(fulfilledSpy);
      expectFinderCalled({ foo: 'bar', baz: 'qux' });
      expectListingCalled({ foo: 'bar', baz: 'qux' });

      expectScenarioListingPrinted('\n- a\n- b');
      expectCommandsNoticePrinted();
      expectNothingMorePrinted();
    });
  });

  it("should forward an error from the scenario finder", function() {

    setAvailableScenarios(new Error('finder bug'));

    var rejectedSpy = list(false);

    runs(function() {

      expectError(rejectedSpy, 'finder bug');
      expectFinderCalled();
      expectListingCalled(false);

      expectNothingPrinted();
    });
  });

  it("should forward an error from the scenario listing", function() {

    setAvailableScenarios('api/a.scenario.js', 'api/b.scenario.js');
    setScenarioListing(new Error('listing bug'));

    var rejectedSpy = list(false);

    runs(function() {

      expectError(rejectedSpy, 'listing bug');
      expectFinderCalled();
      expectListingCalled();

      expectNothingPrinted();
    });
  });

  function expectSuccess(fulfilledSpy) {
    expect(fulfilledSpy).toHaveBeenCalledWith(undefined);
  }

  function expectError(rejectedSpy, message) {
    expect(rejectedSpy).toHaveBeenCalled();
    expect(rejectedSpy.calls[0].args[0]).toBeAnError(message);
  }

  function expectFinderCalled(options) {
    if (options === false) {
      expect(mocks.finder).not.toHaveBeenCalled();
    } else {
      expect(mocks.finder).toHaveBeenCalledWith(_.extend({}, defaultOptions, options));
    }
  }

  function expectListingCalled(options) {
    if (options === false) {
      expect(mocks.listing).not.toHaveBeenCalled();
    } else {
      expect(mocks.listing).toHaveBeenCalledWith(foundScenarios, _.extend({}, defaultOptions, options));
    }
  }

  function expectScenarioListingPrinted(listing) {
    return expectLines(listing.split("\n"));
  }

  function expectCommandsNoticePrinted() {
    return expectLines([
      '',
      'Use `' + 'api-copilot info [scenario]'.underline + '` for more information about a scenario.',
      'Use `' + 'api-copilot run [scenario]'.underline + '` to run a scenario.',
      '[scenario] may be either the number, path or name of the scenario.',
      ''
    ]);
  }

  function expectNothingMorePrinted() {
    expect(lineIndex).toBe(lines.length);
  }

  function expectNothingPrinted() {
    expect(lines).toEqual([]);
  }

  function expectLines(expectedLines) {
    var comparedLines = lines.slice(lineIndex, lineIndex + expectedLines.length);
    expect(comparedLines.join("\n")).toEqual(expectedLines.join("\n"));
    lineIndex += expectedLines.length;
  }
});
