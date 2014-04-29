var _ = require('underscore'),
    colors = require('colors'),
    h = require('./support/helpers'),
    path = require('path'),
    q = require('q');

describe("CLI Listing", function() {

  var ScenarioFinderMock = require('./support/scenario.finder.mock'),
      listingInjector = require('../lib/cli.listing');

  var Listing, listing, defaultOptions, finderMock, printMock, output;
  beforeEach(function() {

    finderMock = new ScenarioFinderMock();

    output = [];
    printMock = function(text) {
      output.push(text || '');
    };

    defaultOptions = { source: 'api' };

    Listing = listingInjector({
      finder: finderMock.finder,
      print: printMock
    });
  });

  var lines;
  function list(options, expectedResult) {

    expectedResult = expectedResult !== undefined ? expectedResult : true;
    listing = new Listing(_.extend({}, defaultOptions, options));

    var result;
        deferred = q.defer();

    runs(function() {
      listing.execute().then(function(listingResult) {
        result = true;
        deferred.resolve(listingResult);
      }, function(err) {
        console.log(err.stack);
        result = false;
        deferred.reject(err);
      });
    });

    waitsFor(function() {
      return result !== undefined;
    }, "the listing to have completed", 50);

    runs(function() {
      expect(result).toBe(expectedResult);
      // TODO: check exact output
      lines = _.filter(output, function(line) {
        return line.trim().length;
      });
    });

    return deferred.promise;
  }

  it("should return a promise resolved with nothing", function() {

    finderMock.addResults([]);

    var fulfilledSpy = jasmine.createSpy();
    list().then(fulfilledSpy);

    runs(function() {
      expect(fulfilledSpy).toHaveBeenCalledWith(undefined);
    });
  });

  it("should show when no scenarios are available", function() {

    finderMock.addResults([]);

    list();

    runs(function() {
      expectFinderCalled();
      expectSource(lines, 'api');
      expect(lines.length).toBe(3);
      expect(lines[2]).toBe('Available API scenarios: none'.yellow);
    });
  });

  it("should list one scenario", function() {

    finderMock.addResults([ 'api/a.scenario.js' ]);

    list();

    runs(function() {
      expectFinderCalled();
      expect(lines.length).toBe(6);
      expectSource(lines, 'api');
      expectAvailable(lines, [ { file: 'api/a.scenario.js', name: 'a' } ]);
      expectInfoNotice(lines);
    });
  });

  it("should list multiple scenarios", function() {

    finderMock.addResults([ 'api/a.scenario.js', 'api/b.scenario.js', 'api/c.scenario.js' ]);

    list();

    runs(function() {
      expectFinderCalled();
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

    finderMock.addResults([ 'custom/a.scenario.js', 'custom/b.scenario.js' ]);

    list({ source: 'custom' });

    runs(function() {
      expectFinderCalled({ source: 'custom' });
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

    finderMock.addResults([ '/custom/a.scenario.js', '/custom/b.scenario.js' ]);

    list({ source: '/custom' });

    runs(function() {
      expectFinderCalled({ source: '/custom' });
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

    finderMock.addResults([
      'api/a.scenario.js', 'api/b.scenario.js',
      'api/sub/c.scenario.js', 'api/sub/sub/d.scenario.js'
    ]);

    list();

    runs(function() {
      expectFinderCalled();
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

    finderMock.addResults([
      'api/a.scenario.js', 'api/b.scenario.js',
      'api/sub/b.scenario.js', 'api/sub/c.scenario.js',
      'api/svb/c.scenario.js'
    ]);

    list();

    runs(function() {
      expectFinderCalled();
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

  function expectFinderCalled(options) {
    expect(finderMock.finder).toHaveBeenCalledWith(_.extend({}, defaultOptions, options));
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
