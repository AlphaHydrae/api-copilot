var _ = require('underscore'),
    h = require('./support/helpers'),
    path = require('path'),
    scenarioFinderUtils = require('./support/scenario.finder.utils'),
    scenarioListingFactory = require('../lib/scenario.listing'),
    slice = Array.prototype.slice;

describe("Scenario Listing", function() {

  var listing, defaultOptions, lines, lineIndex;
  beforeEach(function() {

    lines = [];
    lineIndex = 0;
    defaultOptions = { source: 'api' };

    listing = scenarioListingFactory();
  });

  function list(files, options) {
    lines = listing(scenarioFinderUtils.parseFiles(files || []), _.extend({}, defaultOptions, options)).split("\n");
  }

  it("should show no available scenarios", function() {

    list();

    expectSourceNotice('api');
    expectLines([
      '',
      'Available API scenarios: none'.yellow,
      ''
    ]);
    expectNoMoreLines();
  });

  it("should list one scenario", function() {

    list([ 'api/a.scenario.js' ]);

    expectSourceNotice('api');
    expectListingHeader(1);
    expectLines([
      '1) api/a.scenario.js   (a)'
    ]);
    expectNoMoreLines();
  });

  it("should list multiple scenarios", function() {

    list([ 'api/a.scenario.js', 'api/b.scenario.js', 'api/c.scenario.js' ]);

    expectSourceNotice('api');
    expectListingHeader(3);
    expectLines([
      '1) api/a.scenario.js   (a)',
      '2) api/b.scenario.js   (b)',
      '3) api/c.scenario.js   (c)'
    ]);
    expectNoMoreLines();
  });

  it("should list scenarios from a custom source", function() {

    list([ 'custom/a.scenario.js', 'custom/b.scenario.js', 'custom/c.scenario.js' ], { source: 'custom' });

    expectSourceNotice('custom');
    expectListingHeader(3);
    expectLines([
      '1) custom/a.scenario.js   (a)',
      '2) custom/b.scenario.js   (b)',
      '3) custom/c.scenario.js   (c)'
    ]);
    expectNoMoreLines();
  });

  it("should list scenarios from an absolute source", function() {

    list([ '/custom/a.scenario.js', '/custom/b.scenario.js', '/custom/c.scenario.js' ], { source: '/custom' });

    expectSourceNotice('/custom');
    expectListingHeader(3);
    expectLines([
      '1) /custom/a.scenario.js   (a)',
      '2) /custom/b.scenario.js   (b)',
      '3) /custom/c.scenario.js   (c)'
    ]);
    expectNoMoreLines();
  });

  it("should use file basenames as scenario names", function() {

    list([
      'api/a.scenario.js', 'api/b.scenario.js',
      'api/sub/c.scenario.js', 'api/sub/sub/d.custom.scenario.js'
    ]);

    expectSourceNotice('api');
    expectListingHeader(4);
    expectLines([
      '1) api/a.scenario.js                  (a)',
      '2) api/b.scenario.js                  (b)',
      '3) api/sub/c.scenario.js              (c)',
      '4) api/sub/sub/d.custom.scenario.js   (d.custom)'
    ]);
    expectNoMoreLines();
  });

  it("should show only unique scenario names", function() {

    list([
      'api/a.scenario.js', 'api/b.scenario.js',
      'api/sub/b.scenario.js', 'api/sub/c.scenario.js',
      'api/svb/c.scenario.js'
    ]);

    expectSourceNotice('api');
    expectListingHeader(5);
    expectLines([
      '1) api/a.scenario.js       (a)',
      '2) api/b.scenario.js       (b)',
      '3) api/sub/b.scenario.js',
      '4) api/sub/c.scenario.js   (c)',
      '5) api/svb/c.scenario.js'
    ]);
    expectNoMoreLines();
  });

  it("should require an array of scenarios", function() {
    expect(function() {
      listing({ file: 'api/a.scenario.js', name: 'a' });
    }).toThrow('Expected an array of scenarios, got object');
  });

  it("should require the source option", function() {
    expect(function() {
      listing([], { source: undefined });
    }).toThrow('The source directory option is required');
  });

  function expectSourceNotice(source) {
    expectLines([
      'Source directory: ' + path.resolve(source),
      '  (use the `-s, --source <dir>` option to list API scenarios from another directory)'
    ]);
  }

  function expectListingHeader(n) {
    expectLines([
      '',
      ('Available API scenarios (' + n + '):').bold
    ]);
  }

  function expectNoMoreLines() {
    expect(lineIndex).toBe(lines.length);
  }

  function expectLines(expectedLines) {
    var comparedLines = lines.slice(lineIndex, lineIndex + expectedLines.length);
    expect(comparedLines.join("\n")).toEqual(expectedLines.join("\n"));
    lineIndex += expectedLines.length;
  }
});
