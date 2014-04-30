var _ = require('underscore'),
    colors = require('colors'),
    h = require('./support/helpers'),
    path = require('path'),
    q = require('q'),
    slice = Array.prototype.slice;

describe("CLI Listing", function() {

  var scenarioFinderUtils = require('./support/scenario.finder.utils'),
      listingInjector = require('../lib/cli.listing');

  var Listing, mocks, foundScenarios, defaultOptions, lines;
  beforeEach(function() {

    lines = [];
    foundScenarios = undefined;
    defaultOptions = { source: 'api' };

    mocks = {
      finder: function() {
        return q(foundScenarios);
      },
      print: function(text) {
        lines = lines.concat((text || '').split("\n"));
      }
    };

    spyOn(mocks, 'finder').andCallThrough();

    Listing = listingInjector(mocks);
  });

  function list(options, expectedResult) {
    var listing = new Listing(_.extend({}, defaultOptions, options));
    return h.runPromise(listing.execute(), expectedResult);
  }

  function setAvailableScenarios() {
    foundScenarios = scenarioFinderUtils.parseFiles(slice.call(arguments));
  }

  // TODO: remove this and check exact output
  function cleanOutput() {
    lines = _.filter(lines, function(line) {
      return line.trim().length;
    });
  }

  it("should show when no scenarios are available", function() {

    setAvailableScenarios();

    var fulfilledSpy = list();

    runs(function() {

      expectListingSuccessful(fulfilledSpy);
      expectFinderCalled();

      cleanOutput();
      expectSource(lines, 'api');
      expect(lines.length).toBe(3);
      expect(lines[2]).toBe('Available API scenarios: none'.yellow);
    });
  });

  it("should list one scenario", function() {

    setAvailableScenarios('api/a.scenario.js');

    var fulfilledSpy = list();

    runs(function() {

      expectListingSuccessful(fulfilledSpy);
      expectFinderCalled();

      cleanOutput();
      expect(lines.length).toBe(6);
      expectSource(lines, 'api');
      expectAvailable(lines, [ { file: 'api/a.scenario.js', name: 'a' } ]);
      expectInfoNotice(lines);
    });
  });

  it("should list multiple scenarios", function() {

    setAvailableScenarios('api/a.scenario.js', 'api/b.scenario.js', 'api/c.scenario.js');

    var fulfilledSpy = list();

    runs(function() {

      expectListingSuccessful(fulfilledSpy);
      expectFinderCalled();

      cleanOutput();
      expect(lines.length).toBe(8);
      expectSource(lines, 'api');
      expectAvailable(lines, [
        { file: 'api/a.scenario.js', name: 'a' },
        { file: 'api/b.scenario.js', name: 'b' },
        { file: 'api/c.scenario.js', name: 'c' }
      ]);
      expectInfoNotice(lines);
    });
  });

  it("should list scenarios from a custom source", function() {

    setAvailableScenarios('custom/a.scenario.js', 'custom/b.scenario.js');

    var fulfilledSpy = list({ source: 'custom' });

    runs(function() {

      expectListingSuccessful(fulfilledSpy);
      expectFinderCalled({ source: 'custom' });

      cleanOutput();
      expect(lines.length).toBe(7);
      expectSource(lines, 'custom');
      expectAvailable(lines, [
        { file: 'custom/a.scenario.js', name: 'a' },
        { file: 'custom/b.scenario.js', name: 'b' }
      ]);
      expectInfoNotice(lines);
    });
  });

  it("should list scenarios from an absolute source", function() {

    setAvailableScenarios('/custom/a.scenario.js', '/custom/b.scenario.js');

    var fulfilledSpy = list({ source: '/custom' });

    runs(function() {

      expectListingSuccessful(fulfilledSpy);
      expectFinderCalled({ source: '/custom' });

      cleanOutput();
      expect(lines.length).toBe(7);
      expectSource(lines, '/custom');
      expectAvailable(lines, [
        { file: '/custom/a.scenario.js', name: 'a' },
        { file: '/custom/b.scenario.js', name: 'b' }
      ]);
      expectInfoNotice(lines);
    });
  });

  it("should use file basenames as scenario names", function() {

    setAvailableScenarios(
      'api/a.scenario.js', 'api/b.scenario.js',
      'api/sub/c.scenario.js', 'api/sub/sub/d.scenario.js'
    );

    var fulfilledSpy = list();

    runs(function() {

      expectListingSuccessful(fulfilledSpy);
      expectFinderCalled();

      cleanOutput();
      expect(lines.length).toBe(9);
      expectSource(lines, 'api');
      expectAvailable(lines, [
        { file: 'api/a.scenario.js', name: 'a' },
        { file: 'api/b.scenario.js', name: 'b' },
        { file: 'api/sub/c.scenario.js', name: 'c' },
        { file: 'api/sub/sub/d.scenario.js', name: 'd' }
      ]);
      expectInfoNotice(lines);
    });
  });

  it("should show only unique scenario names", function() {

    setAvailableScenarios(
      'api/a.scenario.js', 'api/b.scenario.js',
      'api/sub/b.scenario.js', 'api/sub/c.scenario.js',
      'api/svb/c.scenario.js'
    );

    var fulfilledSpy = list();

    runs(function() {

      expectListingSuccessful(fulfilledSpy);
      expectFinderCalled();

      cleanOutput();
      expect(lines.length).toBe(10);
      expectSource(lines, 'api');
      expectAvailable(lines, [
        { file: 'api/a.scenario.js', name: 'a' },
        { file: 'api/b.scenario.js', name: 'b' },
        { file: 'api/sub/b.scenario.js', name: false },
        { file: 'api/sub/c.scenario.js', name: 'c' },
        { file: 'api/svb/c.scenario.js', name: false }
      ]);
      expectInfoNotice(lines);
    });
  });

  function expectListingSuccessful(fulfilledSpy) {
    expect(fulfilledSpy).toHaveBeenCalledWith(undefined);
  }

  function expectFinderCalled(options) {
    expect(mocks.finder).toHaveBeenCalledWith(_.extend({}, defaultOptions, options));
  }

  function expectSource(lines, source) {
    expect(lines[0]).toBe('Source directory: ' + path.resolve(source));
    expect(lines[1]).toBe('  (use the `-s, --source <dir>` option to list API scenarios from another directory)');
  }

  function expectAvailable(lines, scenarios) {
    expect(lines[2]).toBe('Available API scenarios (' + scenarios.length + '):');
    _.each(scenarios, function(scenario, i) {
      var line = lines[3 + i].replace(/ +/g, ' ').trim();
      expect(line).toBe((i + 1) + ') ' + scenario.file + (scenario.name ? ' (' + scenario.name + ')' : ''));
    });
  }

  function expectInfoNotice(lines) {
    expect(lines[lines.length - 2]).toBe('Run `api-copilot info [scenario]` for more information about a scenario.');
    expect(lines[lines.length - 1]).toBe('[scenario] may be either the number, path or name of the scenario.');
  }
});
