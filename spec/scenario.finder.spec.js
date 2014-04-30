var _ = require('underscore'),
    h = require('./support/helpers'),
    path = require('path'),
    slice = Array.prototype.slice;

describe("Scenario Finder", function() {

  var finderInjector = require('../lib/scenario.finder');

  var finder, mocks, globResults;
  beforeEach(function() {

    h.addMatchers(this);

    mocks = {
      glob: function(pattern, callback) {
        if (globResults instanceof Error) {
          callback(globResults);
        } else {
          callback(undefined, globResults);
        }
      }
    };

    spyOn(mocks, 'glob').andCallThrough();

    finder = finderInjector(mocks);
  });

  function find(expectedResult, options) {
    return h.runPromise(finder(_.extend({}, options)), expectedResult);
  }

  function setGlobResults() {
    globResults = slice.call(arguments);
  }

  it("should return a rejected promise if not given the source option", function() {

    var rejectedSpy = find(false);

    runs(function() {
      expectGlobCalled(false);
      expectError(rejectedSpy, 'The `source` directory option is required to find API scenarios');
    });
  });

  it("should parse scenario names from glob results", function() {

    setGlobResults('api/bar.scenario.js', 'api/foo.scenario.js', 'api/sub/baz.scenario.js', 'api/sub/qux.corge.scenario.js');

    var fulfilledSpy = find(true, { source: 'api' });

    runs(function() {
      expectGlobCalled('api');
      expectScenariosFound(fulfilledSpy, [
        { file: 'api/bar.scenario.js', name: 'bar' },
        { file: 'api/foo.scenario.js', name: 'foo' },
        { file: 'api/sub/baz.scenario.js', name: 'baz' },
        { file: 'api/sub/qux.corge.scenario.js', name: 'qux.corge' }
      ]);
    });
  });

  it("should sort scenarios by filename", function() {

    setGlobResults('api/c.scenario.js', 'api/a.scenario.js', 'api/d.scenario.js', 'api/sub/b.scenario.js');

    var fulfilledSpy = find(true, { source: 'api' });

    runs(function() {
      expectGlobCalled('api');
      expectScenariosFound(fulfilledSpy, [
        { file: 'api/a.scenario.js', name: 'a' },
        { file: 'api/c.scenario.js', name: 'c' },
        { file: 'api/d.scenario.js', name: 'd' },
        { file: 'api/sub/b.scenario.js', name: 'b' }
      ]);
    });
  });

  it("should find scenarios in a custom source directory", function() {

    setGlobResults('custom/a.scenario.js');

    var fulfilledSpy = find(true, { source: 'custom' });

    runs(function() {
      expectGlobCalled('custom');
      expectScenariosFound(fulfilledSpy, [
        { file: 'custom/a.scenario.js', name: 'a' }
      ]);
    });
  });

  function expectGlobCalled(source) {
    if (source === false) {
      expect(mocks.glob).not.toHaveBeenCalled();
    } else {
      expect(mocks.glob).toHaveBeenCalledWith(path.join(source, '**', '*.scenario.js'), jasmine.any(Function));
    }
  }

  function expectError(rejectedSpy, message) {
    expect(rejectedSpy).toHaveBeenCalled();
    expect(rejectedSpy.calls[0].args[0]).toBeAnError(message);
  }

  function expectScenariosFound(fulfilledSpy, scenarios) {
    expect(fulfilledSpy).toHaveBeenCalledWith(scenarios);
  }
});
