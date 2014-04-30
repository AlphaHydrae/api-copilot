var _ = require('underscore'),
    colors = require('colors'),
    h = require('./support/helpers'),
    path = require('path'),
    q = require('q'),
    slice = Array.prototype.slice;

describe("CLI Info", function() {

  var scenarioFinderUtils = require('./support/scenario.finder.utils'),
      infoInjector = require('../lib/cli.info');

  var Info, mocks, foundScenarios, selectedScenario, choice, lines;
  beforeEach(function() {

    h.addMatchers(this);

    lines = [];
    choice = undefined;
    foundScenarios = undefined;
    selectedScenario = undefined;
    scenarioResult = undefined;

    mocks = {
      finder: function() {
        return foundScenarios instanceof Error ? q.reject(foundScenarios) : q(foundScenarios);
      },
      selector: function() {
        return selectedScenario instanceof Error ? q.reject(selectedScenario) : q(selectedScenario);
      },
      print: function(text) {
        lines = lines.concat((text || '').split("\n"));
      }
    };

    spyOn(mocks, 'finder').andCallThrough();
    spyOn(mocks, 'selector').andCallThrough();

    Info = infoInjector(mocks);
  });

  function info(expectedResult, options) {
    var instance = new Info(_.extend({}, options));
    return h.runPromise(instance.execute(choice), expectedResult);
  }

  function setAvailableScenarios() {
    foundScenarios = scenarioFinderUtils.parseFiles(slice.call(arguments));
  }

  function setSelectedScenario(scenario) {
    if (scenario && !(scenario instanceof Error)) {
      scenario.emit = function() {};
      spyOn(scenario, 'emit');
    }

    selectedScenario = scenario;
  }

  function setChoice(newChoice) {
    choice = newChoice;
  }

  it("should do nothing if there are no available scenarios", function() {

    setAvailableScenarios();
    setSelectedScenario();

    var fulfilledSpy = info();

    runs(function() {
      expectFinderCalled();
      expectSelectorCalled([]);
      expectNothingDisplayed(fulfilledSpy);
    });
  });

  it("should forward options to the finder and selector and the choice to the selector", function() {

    setAvailableScenarios('api/a.scenario.js', 'api/b.scenario.js');
    setSelectedScenario();
    setChoice('foo');

    var fulfilledSpy = info(true, { bar: 'baz' });

    runs(function() {
      expectFinderCalled({ bar: 'baz' });
      expectSelectorCalled(foundScenarios, 'foo', { bar: 'baz' });
      expectNothingDisplayed(fulfilledSpy);
    });
  });

  describe("with an available scenario", function() {

    var defaultScenario;
    beforeEach(function() {

      setAvailableScenarios('api/a.scenario.js', 'api/b.scenario.js');

      defaultScenario = {
        name: 'Sample',
        file: path.resolve('api/b.scenario.js'),
        baseOptions: {},
        steps: []
      };
    });

    function displayInfo(scenarioOptions, options) {

      setSelectedScenario(_.extend({}, defaultScenario, scenarioOptions));

      var fulfilledSpy = info(true, options);

      runs(function() {
        expectFinderCalled(options);
        expectSelectorCalled(foundScenarios, undefined, options);
        expectSuccess(fulfilledSpy);
      });
    }

    it("should display scenario information with no options or steps", function() {

      displayInfo();

      runs(function() {

        var i = 0;
        i = expectHeader(i, 'Sample', 'api/b.scenario.js');
        i = expectBaseConfiguration(i, {});
        i = expectCurrentConfiguration(i, {});
        i = expectSteps(i, []);

        expectNothingMore(i);
      });
    });

    it("should display the base and current configuration", function() {

      displayInfo({
        baseOptions: { foo: 'bar' }
      });

      runs(function() {

        var i = 0;
        i = expectHeader(i, 'Sample', 'api/b.scenario.js');
        i = expectBaseConfiguration(i, { foo: 'bar' });
        i = expectCurrentConfiguration(i, { foo: 'bar' });
        i = expectSteps(i, []);

        expectNothingMore(i);
      });
    });

    it("should display the base configuration and updated current configuration", function() {

      displayInfo({
        baseOptions: { foo: 'bar' }
      }, {
        baz: 'qux',
        corge: 'grault'
      });

      runs(function() {

        var i = 0;
        i = expectHeader(i, 'Sample', 'api/b.scenario.js');
        i = expectBaseConfiguration(i, { foo: 'bar' });
        i = expectCurrentConfiguration(i, { foo: 'bar', baz: 'qux', corge: 'grault' });
        i = expectSteps(i, []);

        expectNothingMore(i);
      });
    });

    it("should display step information", function() {

      displayInfo({
        steps: [
          { name: 'foo' },
          { name: 'bar' },
          { name: 'baz' }
        ]
      });

      runs(function() {

        var i = 0;
        i = expectHeader(i, 'Sample', 'api/b.scenario.js');
        i = expectBaseConfiguration(i, {});
        i = expectCurrentConfiguration(i, {});
        i = expectSteps(i, [
          { name: 'foo' },
          { name: 'bar' },
          { name: 'baz' }
        ]);

        expectNothingMore(i);
      });
    });
  });

  it("should forward an error from the finder", function() {

    foundScenarios = new Error('finder bug');

    var rejectedSpy = info(false);

    runs(function() {
      expectFinderCalled();
      expectSelectorCalled(false);
      expectNothingDisplayed();
      expectError(rejectedSpy, 'finder bug');
    });
  });

  it("should forward an error from the selector", function() {

    setAvailableScenarios('api/a.scenario.js', 'api/b.scenario.js');
    selectedScenario = new Error('selector bug');

    var rejectedSpy = info(false);

    runs(function() {
      expectFinderCalled();
      expectSelectorCalled(foundScenarios);
      expectNothingDisplayed();
      expectError(rejectedSpy, 'selector bug');
    });
  });

  function expectHeader(index, name, file) {
    return expectLines(index, [
      '',
      name.bold,
      path.resolve(file)
    ]);
  }

  function expectBaseConfiguration(index, options) {

    var i = expectLines(index, [
      '',
      'Base configuration of scenario object:'
    ]);

    return expectJson(i, options);
  }

  function expectCurrentConfiguration(index, options) {

    var i = expectLines(index, [
      '',
      'Effective configuration including file and command line options:'
    ]);

    return expectJson(i, options);
  }

  function expectSteps(index, steps) {

    if (!steps.length) {
      return expectLines(index, [
        '',
        'Steps: none'
      ]);
    }

    var i = expectLines(index, [
      '',
      'Steps (' + steps.length + '):',
      ''
    ]);

    return expectLines(i, _.map(steps, function(step, i) {
      return '  ' + (i + 1) + '. ' + step.name;
    }));
  }

  function expectNothingMore(index) {
    var i = expectLines(index, [ '' ]);
    expect(lines.length).toBe(i);
  }

  function expectJson(index, data) {

    var displayedJson = JSON.stringify(data, undefined, 2).replace(/^/mg, '  '),
        jsonLines = displayedJson.split("\n"),
        comparedLines = lines.slice(index, index + jsonLines.length);

    expect(comparedLines.join("\n")).toEqual(displayedJson);

    return index + jsonLines.length;
  }

  function expectLines(index, expectedLines) {
    var comparedLines = lines.slice(index, index + expectedLines.length);
    expect(comparedLines.join("\n")).toEqual(expectedLines.join("\n"));
    return index + expectedLines.length;
  }

  function expectFinderCalled(options) {
    if (options === false) {
      expect(mocks.finder).not.toHaveBeenCalled();
    } else {
      expect(mocks.finder).toHaveBeenCalledWith(_.extend({}, options));
    }
  }

  function expectSelectorCalled(scenarios, choice, options) {
    if (scenarios === false) {
      expect(mocks.selector).not.toHaveBeenCalled();
    } else {
      expect(mocks.selector).toHaveBeenCalledWith(scenarios, choice, _.extend({}, options));
    }
  }

  function expectSuccess(fulfilledSpy) {
    expect(fulfilledSpy).toHaveBeenCalledWith(selectedScenario);
    expect(selectedScenario.emit).toHaveBeenCalledWith('scenario:info');
  }

  function expectNothingDisplayed(fulfilledSpy) {

    expect(lines.length).toBe(0);

    if (fulfilledSpy) {
      expect(fulfilledSpy).toHaveBeenCalledWith(undefined);
    }
  }

  function expectError(rejectedSpy, message) {

    // check that the returned promise was rejected with the error
    expect(rejectedSpy).toHaveBeenCalled();
    expect(rejectedSpy.calls[0].args[0]).toBeAnError(message);
  }
});
