var _ = require('underscore'),
    colors = require('colors'),
    cliInfoFactory = require('../lib/cli.info'),
    fsMock = require('./support/fs.mock'),
    h = require('./support/helpers'),
    path = require('path'),
    q = require('q'),
    scenarioFinderUtils = require('./support/scenario.finder.utils'),
    slice = Array.prototype.slice;

describe("CLI Info", function() {

  var cliInfo, mocks, selectedScenario, choice, lines, lineIndex;
  beforeEach(function() {

    h.addMatchers(this);

    lines = [];
    lineIndex = 0;
    choice = undefined;
    selectedScenario = undefined;
    scenarioResult = undefined;
    fsMock.reset();

    mocks = {
      cliSelector: function() {
        return selectedScenario instanceof Error ? q.reject(selectedScenario) : q(selectedScenario);
      },
      fs: fsMock,
      print: function(text) {
        lines = lines.concat((text || '').split("\n"));
      }
    };

    spyOn(mocks, 'cliSelector').andCallThrough();

    cliInfo = cliInfoFactory(mocks.cliSelector, mocks.fs, mocks.print);
  });

  function info(expectedResult, options) {
    var promise = cliInfo(choice, _.extend({}, options));
    return h.runPromise(promise, expectedResult);
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

    setSelectedScenario();

    var fulfilledSpy = info();

    runs(function() {
      expectSelectorCalled();
      expectNothingDisplayed(fulfilledSpy);
    });
  });

  it("should forward options to the finder and selector and the choice to the selector", function() {

    setSelectedScenario();
    setChoice('foo');

    var fulfilledSpy = info(true, { bar: 'baz' });

    runs(function() {
      expectSelectorCalled('foo', { bar: 'baz' });
      expectNothingDisplayed(fulfilledSpy);
    });
  });

  describe("with an available scenario", function() {

    var defaultScenario;
    beforeEach(function() {

      defaultScenario = {
        name: 'Sample',
        file: path.resolve('api/b.scenario.js'),
        baseOptions: {},
        steps: [],
        parameters: []
      };
    });

    function displayInfo(scenarioOptions, options) {

      setSelectedScenario(_.extend({}, defaultScenario, scenarioOptions));

      var fulfilledSpy = info(true, options);

      runs(function() {
        expectSelectorCalled(undefined, options);
        expectSuccess(fulfilledSpy);
      });
    }

    it("should display scenario information with no options or steps", function() {

      displayInfo();

      runs(function() {

        expectHeader('Sample', 'api/b.scenario.js');
        expectParametersHeader(0);
        expectBaseConfiguration({});
        expectCurrentConfiguration({});
        expectSteps([]);

        expectNothingMore();
      });
    });

    it("should display scenario information with a summary", function() {

      displayInfo({
        summary: 'Short description\nof the scenario.'
      });

      runs(function() {

        expectHeader('Sample', 'api/b.scenario.js', { summary: 'Short description\nof the scenario.' });
        expectParametersHeader(0);
        expectBaseConfiguration({});
        expectCurrentConfiguration({});
        expectSteps([]);

        expectNothingMore();
      });
    });

    it("should display the base and current configuration", function() {

      displayInfo({
        baseOptions: { foo: 'bar' }
      });

      runs(function() {

        expectHeader('Sample', 'api/b.scenario.js');
        expectParametersHeader(0);
        expectBaseConfiguration({ foo: 'bar' });
        expectCurrentConfiguration({ foo: 'bar' });
        expectSteps([]);

        expectNothingMore();
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

        expectHeader('Sample', 'api/b.scenario.js');
        expectParametersHeader(0);
        expectBaseConfiguration({ foo: 'bar' });
        expectCurrentConfiguration({ foo: 'bar', baz: 'qux', corge: 'grault' });
        expectSteps([]);

        expectNothingMore();
      });
    });

    it("should display the configuration file if loaded", function() {

      fsMock.files['config.yml'] = 'log: trace';

      displayInfo({}, {
        config: 'config.yml'
      });

      runs(function() {

        expectHeader('Sample', 'api/b.scenario.js');
        expectParametersHeader(0);
        expectBaseConfiguration({});
        expectCurrentConfiguration({ config: 'config.yml' }, { configFile: 'config.yml', configFileExists: true });
        expectSteps([]);

        expectNothingMore();
      });
    });

    it("should display that the configuration file was not loaded if it does not exist", function() {

      displayInfo({}, {
        config: 'config.yml'
      });

      runs(function() {

        expectHeader('Sample', 'api/b.scenario.js');
        expectParametersHeader(0);
        expectBaseConfiguration({});
        expectCurrentConfiguration({ config: 'config.yml' }, { configFile: 'config.yml', configFileExists: false });
        expectSteps([]);

        expectNothingMore();
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

        expectHeader('Sample', 'api/b.scenario.js');
        expectParametersHeader(0);
        expectBaseConfiguration({});
        expectCurrentConfiguration({});
        expectSteps([
          { name: 'foo' },
          { name: 'bar' },
          { name: 'baz' }
        ]);

        expectNothingMore();
      });
    });

    it("should display parameter information", function() {

      displayInfo({
        parameters: [
          mockParam('foo=value'),
          mockParam('bar=/^regexp/ (required)\n  More documentation.'),
          mockParam('baz boolean flag', function(event, print) {
            if (event == 'describe') {
              print('Additional\nindented\ndocumentation.');
              print('And more.');
            }
          })
        ]
      });

      runs(function() {

        expectHeader('Sample', 'api/b.scenario.js');
        expectParametersHeader(3);
        expectParameter('foo=value');
        expectParameter('bar=/^regexp/ (required)\n  More documentation.');
        expectParameter('baz boolean flag\n  Additional\n  indented\n  documentation.\n  And more.');
        expectBaseConfiguration({});
        expectCurrentConfiguration({});
        expectSteps([]);

        expectNothingMore();
      });
    });
  });

  it("should forward an error from the selector", function() {

    setSelectedScenario(new Error('selector bug'));

    var rejectedSpy = info(false);

    runs(function() {
      expectSelectorCalled();
      expectNothingDisplayed();
      expectError(rejectedSpy, 'selector bug');
    });
  });

  function mockParam(description, listener) {

    var param = {
      emit: function() {
        if (listener) {
          listener.apply(undefined, slice.call(arguments));
        }
      },
      describe: function() {}
    };

    spyOn(param, 'emit').andCallThrough();
    spyOn(param, 'describe').andReturn(description);

    return param;
  }

  function expectHeader(name, file, options) {

    var lines = [
      '',
      'API COPILOT SCENARIO'.bold
    ];

    if (options && options.summary) {
      lines = lines.concat([
        ''
      ]).concat(options.summary.replace(/^/gm, '  ').bold.split("\n"));
    }

    lines = lines.concat([
      '',
      '  Name: ' + name,
      '  File: ' + path.resolve(file)
    ]);

    expectLines(lines);
  }

  function expectParametersHeader(n) {

    if (!n) {
      return expectLines([
        '',
        'PARAMETERS'.bold,
        '  None'
      ]);
    }

    expectLines([
      '',
      ('PARAMETERS (' + n + ')').bold
    ]);
  }

  function expectParameter(description) {

      var paramLines = [
        ''
      ];

      var descriptionLines = description.replace(/^/gm, '  ').split("\n");
      descriptionLines[0] = descriptionLines[0].replace(/^  /, '  -p ');

      expectLines(paramLines.concat(descriptionLines));
  }

  function expectBaseConfiguration(options) {

    expectLines([
      '',
      'BASE CONFIGURATION'.bold,
      '',
      '  Options given to the scenario object:'
    ]);

    expectJson(options, 4);
  }

  function expectCurrentConfiguration(configuration, options) {

    expectLines([
      '',
      'EFFECTIVE CONFIGURATION'.bold,
      ''
    ]);

    if (options && options.configFile) {
      if (options.configFileExists) {
        expectLines([
          '  Configuration file: ' + path.resolve(options.configFile),
          ''
        ]);
      } else {
        expectLines([
          '  No configuration file loaded (search path ' + path.resolve(options.configFile) + ')',
          ''
        ]);
      }
    }

    expectJson(configuration);
  }

  function expectSteps(steps) {

    if (!steps.length) {
      return expectLines([
        '',
        'STEPS'.bold,
        '  None',
        ''
      ]);
    }

    expectLines([
      '',
      ('STEPS (' + steps.length + ')').bold,
      ''
    ]);

    expectLines(_.map(steps, function(step, i) {
      return '  ' + (i + 1) + '. ' + step.name;
    }));

    expectLines([ '' ]);
  }

  function expectNothingMore() {
    expect(lineIndex).toBe(lines.length);
  }

  function expectJson(data, indent) {

    var displayedJson = JSON.stringify(data, undefined, 2).replace(/^/mg, new Array((indent || 2) + 1).join(' '));

    expectLines(displayedJson.split("\n"));
  }

  function expectLines(expectedLines) {
    var comparedLines = lines.slice(lineIndex, lineIndex + expectedLines.length);
    expect(comparedLines.join("\n")).toEqual(expectedLines.join("\n"));
    lineIndex += expectedLines.length;
  }

  function expectSelectorCalled(choice, options) {
    if (choice === false) {
      expect(mocks.cliSelector).not.toHaveBeenCalled();
    } else {
      expect(mocks.cliSelector).toHaveBeenCalledWith(choice, _.extend({}, options));
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
