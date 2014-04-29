var _ = require('underscore'),
    colors = require('colors'),
    h = require('./support/helpers'),
    path = require('path');

describe("CLI Listing", function() {

  var globMock = require('./support/glob.mock'),
      listingInjector = require('../lib/cli.listing');

  var Listing, listing;
  beforeEach(function() {

    globMock.reset();

    Listing = listingInjector({
      glob: globMock
    });
  });

  function list(options) {

    listing = new Listing(_.extend({ source: 'api' }, options));

    var output = h.capture(function() {
      listing.execute();
    });

    return _.filter(output.stdout.split("\n"), function(line) {
      return line.trim().length;
    });
  }

  it("should return nothing", function() {

    listing = new Listing({ source: 'api' });

    var result;
    h.capture(function() {
      result = listing.execute();
    });

    expect(result).toBe(undefined);
  });

  it("should show when no scenarios are available", function() {
    var lines = list();
    expectSource(lines, 'api');
    expect(lines.length).toBe(3);
    expect(lines[2]).toBe('Available API scenarios: none'.yellow);
  });

  it("should list one scenario", function() {

    globMock.setResults(path.join('api', '**', '*.scenario.js'), [ 'api/a.scenario.js' ]);

    var lines = list();
    expect(lines.length).toBe(6);
    expectSource(lines, 'api');
    expectAvailable(lines, [ { file: 'api/a.scenario.js', name: 'a' } ]);
    expectInfoNotice(lines);
  });

  it("should list multiple scenarios", function() {

    globMock.setResults(path.join('api', '**', '*.scenario.js'), [ 'api/a.scenario.js', 'api/b.scenario.js', 'api/c.scenario.js' ]);

    var lines = list();
    expect(lines.length).toBe(8);
    expectSource(lines, 'api');
    expectAvailable(lines, [
      { file: 'api/a.scenario.js', name: 'a' },
      { file: 'api/b.scenario.js', name: 'b' },
      { file: 'api/c.scenario.js', name: 'c' }
    ]);
    expectInfoNotice(lines);
  });

  it("should list scenarios from a custom source", function() {

    globMock.setResults(path.join('custom', '**', '*.scenario.js'), [ 'custom/a.scenario.js', 'custom/b.scenario.js' ]);

    var lines = list({ source: 'custom' });
    expect(lines.length).toBe(7);
    expectSource(lines, 'custom');
    expectAvailable(lines, [
      { file: 'custom/a.scenario.js', name: 'a' },
      { file: 'custom/b.scenario.js', name: 'b' }
    ]);
    expectInfoNotice(lines);
  });

  it("should list scenarios from an absolute source", function() {

    globMock.setResults(path.join('/custom', '**', '*.scenario.js'), [ '/custom/a.scenario.js', '/custom/b.scenario.js' ]);

    var lines = list({ source: '/custom' });
    expect(lines.length).toBe(7);
    expectSource(lines, '/custom');
    expectAvailable(lines, [
      { file: '/custom/a.scenario.js', name: 'a' },
      { file: '/custom/b.scenario.js', name: 'b' }
    ]);
    expectInfoNotice(lines);
  });

  it("should use file basenames as scenario names", function() {

    globMock.setResults(path.join('api', '**', '*.scenario.js'), [
      'api/a.scenario.js', 'api/b.scenario.js',
      'api/sub/c.scenario.js', 'api/sub/sub/d.scenario.js'
    ]);

    var lines = list();
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

  it("should show only unique scenario names", function() {

    globMock.setResults(path.join('api', '**', '*.scenario.js'), [
      'api/a.scenario.js', 'api/b.scenario.js',
      'api/sub/b.scenario.js', 'api/sub/c.scenario.js',
      'api/svb/c.scenario.js'
    ]);

    var lines = list();
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
