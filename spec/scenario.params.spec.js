var _ = require('underscore'),
    colors = require('colors'),
    h = require('./support/helpers'),
    q = require('q');

describe("Scenario Parameters", function() {

  var scenarioFactory = require('../lib/scenario'),
      parameterExtensionsFactory = require('../lib/scenario.ext.params'),
      log4jsMock = require('./support/log4js.mock');

  var PARAMETER_METHODS = [ 'prompt', 'validate', 'processValues' ];

  var Scenario, scenario, mocks, lines;
  beforeEach(function() {

    h.addMatchers(this);

    lines = [];

    mocks = {
      print: function(text) {
        lines = lines.concat((text || '').split("\n"));
      },
      parameterMocks: [],
      parameterFactory: function(name, options) {

        var defaultMethods = {
          prompt: function() {},
          validate: function() {},
          processValues: function(values) {
            return values;
          }
        };

        var mock = _.extend(_.defaults(mocks.parameterMocks.shift() || {}, defaultMethods), { name: name, options: options });

        _.each(PARAMETER_METHODS, function(method) {
          spyOn(mock, method).andCallThrough();
        });

        return mock;
      }
    };

    spyOn(mocks, 'parameterFactory').andCallThrough();

    var parameterExtensions = parameterExtensionsFactory(mocks.parameterFactory, mocks.print);

    Scenario = scenarioFactory([ parameterExtensions ], log4jsMock, mocks.print);

    scenario = new Scenario({ name: 'once upon a time' });
  });

  function runScenario(expectedResult, runOptions) {
    return h.runPromise(scenario.run(runOptions || {}), expectedResult);
  }

  function mockParameter(methods) {
    var mock = _.extend({}, methods);
    mocks.parameterMocks.push(mock);
    return mock;
  }

  it("should be created with the injected parameter factory", function() {

    scenario.addParam('foo', { a: 'b' });
    expect(mocks.parameterFactory).toHaveBeenCalledWith('foo', { a: 'b' });

    scenario.addParam('bar', { c: 'd', e: 'f' });
    expect(mocks.parameterFactory).toHaveBeenCalledWith('bar', { c: 'd', e: 'f' });

    scenario.addParam('baz');
    expect(mocks.parameterFactory).toHaveBeenCalledWith('baz', undefined);

    expect(mocks.parameterFactory.calls.length).toBe(3);
  });

  it("should be validated", function() {

    var params = [];
    _.times(3, function() {
      params.push(mockParameter());
    });

    scenario.addParam('foo');
    scenario.addParam('bar');
    scenario.addParam('baz');

    scenario.step('step', function() {});

    var fulfilledSpy = runScenario(true, { params: { foo: 'bar', bar: true } });

    runs(function() {
      expectSuccess(fulfilledSpy);
      expect(params[0].validate).toHaveBeenCalledWith('bar', []);
      expect(params[1].validate).toHaveBeenCalledWith(true, []);
      expect(params[2].validate).toHaveBeenCalledWith(undefined, []);
    });
  });

  it("should process values", function() {

    var names = [ 'foo', 'bar', 'baz', 'qux' ],
        values = [ 'value', true, [ 1, 2 ] ];

    var params = [];
    _.times(names.length, function(i) {
      params.push(mockParameter({
        processValues: function() {
          return i;
        }
      }));
    });

    _.each(names, function(name) {
      scenario.addParam(name);
    });

    var actualValues = {};
    scenario.step('step', function() {
      actualValues = _.reduce(names, function(memo, name) {
        memo[name] = this.param(name);
        return memo;
      }, {}, this);
    });

    var fulfilledSpy = runScenario(true, {
      params: _.reduce(names, function(memo, name, i) {
        if (values[i] !== undefined) {
          memo[name] = values[i];
        }
        return memo;
      }, {})
    });

    runs(function() {
      expectSuccess(fulfilledSpy);
      _.each(names, function(name, i) {
        expect(params[i].processValues).toHaveBeenCalledWith(values[i]);
      });
      expect(actualValues).toEqual({ foo: 0, bar: 1, baz: 2, qux: 3 });
    });
  });

  it("should forward an error in validation methods", function() {

    scenario.step('step', function() {});

    mockParameter({ validate: function() { throw new Error('validation bug'); } });
    scenario.addParam('foo');

    var rejectedSpy = runScenario(false);

    runs(function() {
      expectFailure(rejectedSpy, 'validation bug');
    });
  });

  it("should cause a scenario to fail if unknown", function() {

    scenario.step('step', function() {
      this.param('unknown');
    });

    var rejectedSpy = runScenario(false);

    runs(function() {
      expectFailure(rejectedSpy, 'Unknown parameter "unknown"; add it to the Scenario object with the `addParam` method');
    });
  });

  it("should cause a scenario to fail if unknown from constructor", function() {

    scenario = new Scenario({ name: 'once upon a time', params: { foo: 'bar', baz: 'qux' } });
    scenario.addParam('foo');

    scenario.step('step', function() {});

    var rejectedSpy = runScenario(false);

    runs(function() {
      expectFailure(rejectedSpy, 'Unknown parameter "baz"; add it to the Scenario object with the `addParam` method');
    });
  });

  it("should cause a scenario to fail if unknown at runtime", function() {

    scenario.addParam('foo');

    scenario.step('step', function() {});

    var rejectedSpy = runScenario(false, { params: { foo: 'bar', baz: 'qux' } });

    runs(function() {
      expectFailure(rejectedSpy, 'Unknown parameter "baz"; add it to the Scenario object with the `addParam` method');
    });
  });

  describe("configuration", function() {

    it("should be configurable at construction", function() {

      scenario = new Scenario({ name: 'once upon a time', params: { foo: 'bar', baz: 'qux' } });
      scenario.addParam('foo');
      scenario.addParam('baz');

      var values = [];
      scenario.step('step', function() {
        values.push(this.param('foo'));
        values.push(this.param('baz'));
      });

      var fulfilledSpy = runScenario();

      runs(function() {
        expectSuccess(fulfilledSpy);
        expect(values).toEqual([ 'bar', 'qux' ]);
      });
    });

    it("should be configurable at runtime", function() {

      scenario.addParam('foo');
      scenario.addParam('baz');

      var values = [];
      scenario.step('step', function() {
        values.push(this.param('foo'));
        values.push(this.param('baz'));
      });

      var fulfilledSpy = runScenario(true, { params: { foo: 'bar', baz: 'qux' } });

      runs(function() {
        expectSuccess(fulfilledSpy);
        expect(values).toEqual([ 'bar', 'qux' ]);
      });
    });

    it("should override construction params with runtime params", function() {

      scenario = new Scenario({ name: 'once upon a time', params: { foo: 'bar', baz: 'qux' } });
      scenario.addParam('foo');
      scenario.addParam('baz');
      scenario.addParam('grault');

      var values = [];
      scenario.step('step', function() {
        values.push(this.param('foo'));
        values.push(this.param('baz'));
        values.push(this.param('grault'));
      });

      var fulfilledSpy = runScenario(true, { params: { foo: 'corge', grault: 'garply' } });

      runs(function() {
        expectSuccess(fulfilledSpy);
        expect(values).toEqual([ 'corge', 'qux', 'garply' ]);
      });
    });

    it("should be configurable with a custom loading function", function() {

      scenario.addParam('foo');
      scenario.addParam('baz');

      scenario.loadParametersWith(function(params) {
        return _.extend(params, { foo: 'bar', baz: 'qux' });
      });

      var values = [];
      scenario.step('step', function() {
        values.push(this.param('foo'));
        values.push(this.param('baz'));
      });

      var fulfilledSpy = runScenario(true);

      runs(function() {
        expectSuccess(fulfilledSpy);
        expect(values).toEqual([ 'bar', 'qux' ]);
      });
    });

    it("should be configurable with a loading function that returns a promise", function() {

      scenario.addParam('foo');
      scenario.addParam('baz');

      scenario.loadParametersWith(function(params) {
        return q(_.extend({}, params, { foo: 'qux', baz: 'bar' })).delay(15);
      });

      var values = [];
      scenario.step('step', function() {
        values.push(this.param('foo'));
        values.push(this.param('baz'));
      });

      var fulfilledSpy = runScenario(true);

      runs(function() {
        expectSuccess(fulfilledSpy);
        expect(values).toEqual([ 'qux', 'bar' ]);
      });
    });

    it("should be configurable with a multiple loading functions", function() {

      scenario.addParam('foo');
      scenario.addParam('bar');
      scenario.addParam('baz');

      var order = [];

      scenario.loadParametersWith(function(params) {
        order.push(1);
        return { foo: 'bad' };
      });

      scenario.loadParametersWith(function(params) {
        order.push(2);
        return q({ foo: 'a', baz: 'b' }).delay(15);
      });

      scenario.loadParametersWith(function(params) {
        order.push(3);
        return _.extend({}, params, { bar: 'c' });
      });

      var values = [];
      scenario.step('step', function() {
        values.push(this.param('foo'));
        values.push(this.param('bar'));
        values.push(this.param('baz'));
      });

      var fulfilledSpy = runScenario(true);

      runs(function() {
        expectSuccess(fulfilledSpy);
        expect(order).toEqual([ 1, 2, 3 ]);
        expect(values).toEqual([ 'a', 'c', 'b' ]);
      });
    });

    it("should cause the scenario to fail if a loading function returns nothing", function() {

      scenario.addParam('foo');
      scenario.loadParametersWith(function() {});
      scenario.step('step', function() {});

      var rejectedSpy = runScenario(false);

      runs(function() {
        expectFailure(rejectedSpy, 'Parameter loading function at index 0 returned nothing; it must return the updated runtime parameters');
      });
    });

    it("should cause the scenario to fail if a loading function returns a non-object", function() {

      scenario.addParam('foo');
      scenario.loadParametersWith(function(params) { return {}; });
      scenario.loadParametersWith(function(params) { return true; });
      scenario.step('step', function() {});

      var rejectedSpy = runScenario(false);

      runs(function() {
        expectFailure(rejectedSpy, 'Expected parameter loading function at index 1 to return updated runtime parameters as an object, got boolean');
      });
    });
  });

  describe("with validation errors", function() {

    var params, errorsArgs, messages;
    beforeEach(function() {

      params = [];
      errorsArgs = [];
      messages = [ [ 'foo' ], [ 'bar', 'baz' ], [], [ 'qux', 'corge', 'grault' ], [] ];
      promptDeferreds = [ q.defer(), q.defer(), q.defer(), q.defer(), q.defer() ];
      corrections = [ 'a', 'b', 'c', 'd', 'e' ];

      _.times(5, function(i) {
        params.push(mockParameter({

          validate: function(value, errors) {

            errorsArgs.push(errors.slice());

            _.each(messages[i], function(message) {
              errors.push(message);
            });

            return !messages[i].length;
          },

          prompt: function() {
            return promptDeferreds[i].promise;
          }
        }));
      });

      scenario.addParam('foo');
      scenario.addParam('bar');
      scenario.addParam('baz');
      scenario.addParam('qux');
      scenario.addParam('corge');

      scenario.step('step', function() {});
    });

    function resolveCorrections() {
      _.each(promptDeferreds, function(deferred, i) {
        deferred.resolve(corrections[i]);
      });
    }

    it("should collect validation errors in the supplied array", function() {

      var fulfilledSpy = runScenario(true, { params: { foo: 'bar', bar: true, qux: '   ' } });
      resolveCorrections();

      runs(function() {
        expectSuccess(fulfilledSpy);
        expect(errorsArgs[0]).toEqual([]);
        expect(errorsArgs[1]).toEqual([ 'foo' ]);
        expect(errorsArgs[2]).toEqual([ 'foo', 'bar', 'baz' ]);
        expect(errorsArgs[3]).toEqual([ 'foo', 'bar', 'baz' ]);
        expect(errorsArgs[4]).toEqual([ 'foo', 'bar', 'baz', 'qux', 'corge', 'grault' ]);
      });
    });

    it("should prompt for new values for invalid parameters", function() {

      var fulfilledSpy = jasmine.createSpy();
      scenario.run({ params: { foo: 'bar', bar: true, qux: '   ', corge: '*' } }).then(fulfilledSpy);

      waitsFor(function() {
        return params[0].prompt.calls.length;
      }, "the correction of the first parameter to have been prompted", 50);

      runs(function() {
        expect(fulfilledSpy).not.toHaveBeenCalled();

        expect(lines.slice(0, 8)).toEqual([
          '',
          'The scenario cannot be run because the following parameters are either missing or invalid:'.yellow,
          '- foo',
          '- bar',
          '- baz',
          '- qux',
          '- corge',
          '- grault'
        ]);

        expect(lines.slice(8, 11)).toEqual([
          '',
          'You will now be asked for the missing or corrected values.'.green,
          'Press Ctrl-C to quit.'.green
        ]);

        expect(lines.length).toBe(11);
        lines.length = 0;

        expect(params[0].prompt).toHaveBeenCalledWith(undefined);
        _.each(params.slice(1), function(param) { expect(param.prompt).not.toHaveBeenCalled(); });

        expect(scenario.param('foo')).toBe(undefined);
        expect(scenario.param('bar')).toBe(undefined);
        expect(scenario.param('baz')).toBe(undefined);
        expect(scenario.param('qux')).toBe(undefined);
        expect(scenario.param('corge')).toBe(undefined);

        promptDeferreds[0].resolve(corrections[0]);
      });

      waitsFor(function() {
        return params[1].prompt.calls.length;
      }, 'the correction of the second parameter to have been prompted', 50);

      runs(function() {
        expect(fulfilledSpy).not.toHaveBeenCalled();

        expect(lines[0]).toBe(('Parameter ' + 'foo'.bold + ' set to:').green + ' a');
        expect(lines.length).toBe(1);
        lines.length = 0;

        expect(params[1].prompt).toHaveBeenCalledWith(undefined);
        _.each(params.slice(2), function(param) { expect(param.prompt).not.toHaveBeenCalled(); });

        expect(scenario.param('foo')).toBe(undefined);
        expect(scenario.param('bar')).toBe(undefined);
        expect(scenario.param('baz')).toBe(undefined);
        expect(scenario.param('qux')).toBe(undefined);
        expect(scenario.param('corge')).toBe(undefined);

        promptDeferreds[1].resolve(corrections[1]);
      });

      waitsFor(function() {
        return params[3].prompt.calls.length;
      }, 'the correction of the fourth parameter to have been prompted', 50);

      runs(function() {
        expect(fulfilledSpy).not.toHaveBeenCalled();

        expect(lines[0]).toBe(('Parameter ' + 'bar'.bold + ' set to:').green + ' b');
        expect(lines.length).toBe(1);
        lines.length = 0;

        expect(params[2].prompt).not.toHaveBeenCalled();
        expect(params[3].prompt).toHaveBeenCalledWith(undefined);
        _.each(params.slice(4), function(param) { expect(param.prompt).not.toHaveBeenCalled(); });

        expect(scenario.param('foo')).toBe(undefined);
        expect(scenario.param('bar')).toBe(undefined);
        expect(scenario.param('baz')).toBe(undefined);
        expect(scenario.param('qux')).toBe(undefined);
        expect(scenario.param('corge')).toBe(undefined);

        promptDeferreds[3].resolve(corrections[3]);
      });

      waitsFor(function() {
        return fulfilledSpy.calls.length;
      }, 'the scenario to have finished running', 50);

      runs(function() {
        expectSuccess(fulfilledSpy);

        expect(lines[0]).toBe(('Parameter ' + 'qux'.bold + ' set to:').green + ' d');
        expect(lines.slice(1)).toEqual([ '', '' ]);

        expect(params[4].prompt).not.toHaveBeenCalled();

        expect(scenario.param('foo')).toBe('a');
        expect(scenario.param('bar')).toBe('b');
        expect(scenario.param('baz')).toBe(undefined);
        expect(scenario.param('qux')).toBe('d');
        expect(scenario.param('corge')).toBe('*');
      });
    });

    it("should forward an error in prompt methods", function() {

      promptDeferreds[0].reject(new Error('prompt bug'));

      var rejectedSpy = runScenario(false);

      runs(function() {
        expectFailure(rejectedSpy, 'prompt bug');
      });
    });
  });

  describe("#addParam", function() {

    beforeEach(function() {
      scenario = new Scenario({ name: 'once upon a time' });
    });

    it("should require a name", function() {
      _.each([ undefined, null, false, true, 2.4, [], {} ], function(invalidName) {
        expect(function() {
          scenario.addParam(invalidName);
        }).toThrow('Parameter name must be a string');
      });
    });

    it("should not accept a parameter name that was already used", function() {
      scenario.addParam('foo');
      expect(function() {
        scenario.addParam('foo');
      }).toThrow('The parameter "foo" is already defined');
    });
  });

  describe("#getParameter", function() {

    var mockMethodMatchers = _.reduce(PARAMETER_METHODS, function(memo, name) {
      memo[name] = jasmine.any(Function);
      return memo;
    }, {});

    beforeEach(function() {
      scenario = new Scenario({ name: 'once upon a time' });
      scenario.addParam('foo');
      scenario.addParam('bar', { baz: 'qux' });
    });

    function expectParameter(name, options) {
      expect(scenario.getParameter(name)).toEqual(_.extend({ name: name, options: options }, mockMethodMatchers));
    }

    it("should retrieve a parameter by name", function() {
      expectParameter('foo');
    });

    it("should retrieve a parameter with options by name", function() {
      expectParameter('bar', { baz: 'qux' });
    });

    it("should not retrieve an unknown parameter", function() {
      expect(scenario.getParameter('unknown')).toBe(undefined);
    });
  });

  describe("#param", function() {

    beforeEach(function() {
      scenario = new Scenario({ name: 'once upon a time', params: { foo: 'bar' } });
      scenario.addParam('foo');
      scenario.addParam('bar');
      scenario.step('step', function() {});
    });

    it("should not retrieve parameter values before the scenario has run", function() {
      expect(scenario.param('foo')).toBe(undefined);
      expect(scenario.param('bar')).toBe(undefined);
    });

    it("should throw an error for unknown parameters", function() {
      expect(function() {
        scenario.param('baz');
      }).toThrow('Unknown parameter "baz"; add it to the Scenario object with the `addParam` method');
    });

    it("should retrieve a parameter value by name", function() {

      var fulfilledSpy = runScenario();

      runs(function() {
        expect(scenario.param('foo')).toBe('bar');
      });
    });

    it("should retrieve a missing parameter value", function() {

      var fulfilledSpy = runScenario();

      runs(function() {
        expect(scenario.param('bar')).toBe(undefined);
      });
    });

    it("should retrieve overidden parameter values", function() {

      var fulfilledSpy = runScenario(true, { params: { foo: 'baar', bar: [ 1, 2 ] } });

      runs(function() {
        expect(scenario.param('foo')).toBe('baar');
        expect(scenario.param('bar')).toEqual([ 1, 2 ]);
      });
    });

    it("should cause the scenario to fail for unknown parameters", function() {

      scenario.step('retrieve unknown parameter', function() {
        this.param('baz');
      });

      var rejectedSpy = runScenario(false);

      runs(function() {
        expect(rejectedSpy).toHaveBeenCalled();
        expect(rejectedSpy.calls[0].args[0]).toBeAnError('Unknown parameter "baz"; add it to the Scenario object with the `addParam` method');
      });
    });
  });

  function expectSuccess(fulfilledSpy) {
    expect(fulfilledSpy).toHaveBeenCalledWith(undefined);
  }

  function expectFailure(rejectedSpy, message) {
    expect(rejectedSpy).toHaveBeenCalled();
    expect(rejectedSpy.calls[0].args[0]).toBeAnError(message);
  }
});
