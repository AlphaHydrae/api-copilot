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

  it("should be configurable at construction", function() {

    scenario = new Scenario({ name: 'once upon a time', params: { foo: 'bar', baz: 'qux' } });

    var values = [];
    scenario.step('step', function() {
      values.push(this.param('foo'));
      values.push(this.param('baz'));
    });

    h.runScenario(scenario);

    runs(function() {
      expect(values).toEqual([ 'bar', 'qux' ]);
    });
  });

  it("should be configurable at runtime", function() {

    scenario = new Scenario({ name: 'once upon a time' });

    var values = [];
    scenario.step('step', function() {
      values.push(this.param('foo'));
      values.push(this.param('baz'));
    });

    h.runScenario(scenario, true, { runOptions: { params: { foo: 'bar', baz: 'qux' } } });

    runs(function() {
      expect(values).toEqual([ 'bar', 'qux' ]);
    });
  });

  it("should override construction params with runtime params", function() {

    scenario = new Scenario({ name: 'once upon a time', params: { foo: 'bar', baz: 'qux' } });

    var values = [];
    scenario.step('step', function() {
      values.push(this.param('foo'));
      values.push(this.param('baz'));
      values.push(this.param('grault'));
    });

    h.runScenario(scenario, true, { runOptions: { params: { foo: 'corge', grault: 'garply' } } });

    runs(function() {
      expect(values).toEqual([ 'corge', 'qux', 'garply' ]);
    });
  });

  it("should cause a scenario to fail if unknown", function() {

    scenario.step('step', function() {
      this.param('unknown');
    });

    var error;
    h.runScenario(scenario, false).fail(function(err) {
      error = err;
    });

    runs(function() {
      expect(error).toBeAnError('Unknown parameter "unknown"; add it to Scenario object with the `addParam` method');
    });
  });

  describe("#param", function() {

    beforeEach(function() {
      scenario = new Scenario({ name: 'once upon a time', params: { foo: 'bar' } });
    });

    it("should retrieve a param by name", function() {
      expect(scenario.param('foo')).toEqual('bar');
    });

    it("should throw an error for unknown params by default", function() {
      expect(function() {
        scenario.param('bar');
      }).toThrow('Unknown parameter "bar"; give it to the Scenario object at construction or from the command line with the -p, --params option');
    });

    it("should throw an error with a custom message if specified", function() {
      expect(function() {
        scenario.param('bar', { message: 'foo' });
      }).toThrow('foo');
    });

    it("should not throw an error if the required option is falsy", function() {
      expect(scenario.param('bar', { required: false })).toBe(undefined);
    });
  });

  describe("#requireParameters", function() {

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
  });
});
