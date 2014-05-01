var _ = require('underscore'),
    h = require('./support/helpers'),
    q = require('q');

describe("Scenario Parameters", function() {

  var scenarioInjector = require('../lib/scenario'),
      log4jsMock = require('./support/log4js.mock'),
      ClientMock = require('./support/client.mock');

  var Scenario, scenario;
  beforeEach(function() {

    h.addMatchers(this);

    Scenario = scenarioInjector({
      log4js: log4jsMock,
      Client: ClientMock
    });

    scenario = new Scenario({ name: 'once upon a time' });
  });

  function runScenario(expectedResult, runOptions) {
    return h.runPromise(scenario.run(runOptions || {}), expectedResult);
  }

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

    scenario = new Scenario({ name: 'once upon a time' });
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

  it("should cause a scenario to fail if unknown", function() {

    scenario.step('step', function() {
      this.param('unknown');
    });

    var rejectedSpy = runScenario(false);

    runs(function() {
      expectFailure(rejectedSpy, 'Unknown parameter "unknown"; add it to the Scenario object with the `addParam` method');
    });
  });

  describe("#param", function() {

    beforeEach(function() {
      scenario = new Scenario({ name: 'once upon a time', params: { foo: 'bar' } });
      scenario.addParam('foo');
      scenario.addParam('bar');
    });

    it("should retrieve a param by name", function() {
      expect(scenario.param('foo')).toBe('bar');
    });

    it("should retrieve a param with no value", function() {
      expect(scenario.param('bar')).toBe(undefined);
    });

    it("should throw an error for unknown params", function() {
      expect(function() {
        scenario.param('baz');
      }).toThrow('Unknown parameter "baz"; add it to the Scenario object with the `addParam` method');
    });
  });

  /*describe("#requireParameters", function() {

    beforeEach(function() {
      scenario.step('step', function() {});
      scenario.requireParameters('foo', 'bar');
    });

    it("should cause a scenario to throw an error when run if the parameters are missing", function() {
      expect(function() {
        scenario.run();
      }).toThrow('The following required parameters are missing: foo, bar');
    });

    it("should not do anything if the parameters are present", function() {
      h.runScenario(scenario, true, { runOptions: { params: { foo: true, bar: true } } });
    });
  });*/

  function expectSuccess(fulfilledSpy) {
    expect(fulfilledSpy).toHaveBeenCalledWith(undefined);
  }

  function expectFailure(rejectedSpy, message) {
    expect(rejectedSpy).toHaveBeenCalled();
    expect(rejectedSpy.calls[0].args[0]).toBeAnError(message);
  }
});
