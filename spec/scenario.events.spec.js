var _ = require('underscore'),
    h = require('./support/helpers'),
    ioc = require('../lib/ioc');

describe("Scenario Events", function() {

  var scenarioFactory = require('../lib/scenario'),
      scenarioParametersFactory = require('../lib/scenario.params'),
      parameterFactory = ioc.create('parameter.factory'),
      log4jsMock = require('./support/log4js.mock'),
      ClientMock = require('./support/client.mock'),
      EventCollector = require('./support/event.collector');

  var Scenario, scenario, collector, events;
  beforeEach(function() {

    collector = new EventCollector();
    events = collector.events;

    var parameterExtensions = scenarioParametersFactory(parameterFactory, function() {});

    Scenario = scenarioFactory(ClientMock, parameterExtensions, log4jsMock, function() {});

    scenario = new Scenario({ name: 'once upon a time' });
  });

  it("should emit `configure`, `scenario:start` and `scenario:end` when successful", function() {

    collector.collect(scenario, 'configure', 'scenario:start', 'scenario:end');
    _.times(3, function(i){ scenario.step('step ' + i, function() { collector.add('executing step ' + i); }); });

    h.runScenario(scenario);

    runs(function() {
      expect(events).toEqual([
        { name: 'configure', args: [ { name: 'once upon a time' } ] },
        { name: 'scenario:start', args: [ { name: 'once upon a time' } ] },
        { name: 'executing step 0', args: [] },
        { name: 'executing step 1', args: [] },
        { name: 'executing step 2', args: [] },
        { name: 'scenario:end', args: [] }
      ]);
    });
  });

  it("should emit `configure`, `scenario:start` and `scenario:error` when failed", function() {

    var error = new Error('bug');
    collector.collect(scenario, 'configure', 'scenario:start', 'scenario:error');
    scenario.step('step 0', function() { collector.add('executing step 0'); });
    scenario.step('step 1', function() { collector.add('executing step 1'); return this.fail(error); });
    scenario.step('step 2', function() { collector.add('executing step 2'); });

    h.runScenario(scenario, false);

    runs(function() {
      expect(events).toEqual([
        { name: 'configure', args: [ { name: 'once upon a time' } ] },
        { name: 'scenario:start', args: [ { name: 'once upon a time' } ] },
        { name: 'executing step 0', args: [] },
        { name: 'executing step 1', args: [] },
        { name: 'scenario:error', args: [ error ] }
      ]);
    });
  });

  it("should emit client events with the `client:` prefix", function() {

    collector.collect(scenario, 'client:request', 'client:error', 'client:response');
    scenario.client.emit('request', 'foo');
    scenario.client.emit('error', { bar: 'baz' });
    scenario.client.emit('response', 'qux', 'corge');

    expect(events).toEqual([
      { name: 'client:request', args: [ 'foo' ] },
      { name: 'client:error', args: [ { bar: 'baz' } ] },
      { name: 'client:response', args: [ 'qux', 'corge' ] }
    ]);
  });

  describe("Step Events", function() {

    beforeEach(function() {
      collector.collect(scenario, 'step:start', 'step:error', 'step:skip', 'step:done');
    });

    it("should emit `step:start` and `step:done` for a successful step", function() {

      scenario.step('step', function() { collector.add('executing'); return this.success('foo', 'bar', 'baz'); });

      h.runScenario(scenario);

      runs(function() {
        expect(events).toEqual([
          { name: 'step:start', args: [ { name: 'step' } ] },
          { name: 'executing', args: [] },
          { name: 'step:done', args: [ { name: 'step' }, 'foo', 'bar', 'baz' ] }
        ]);
      });
    });

    it("should emit `step:start` and `step:skip` for a skipped step", function() {

      scenario.step('step', function() { collector.add('executing'); return this.skip('skipped', 'foo', 'bar'); });

      h.runScenario(scenario);

      runs(function() {
        expect(events).toEqual([
          { name: 'step:start', args: [ { name: 'step' } ] },
          { name: 'executing', args: [] },
          { name: 'step:skip', args: [ { name: 'step' }, 'skipped', 'foo', 'bar' ] }
        ]);
      });
    });

    it("should emit `step:start` and `step:skip` for a step skipped with no message", function() {

      scenario.step('step', function() { collector.add('executing'); return this.skip(false, 'foo', 'bar'); });

      h.runScenario(scenario);

      runs(function() {
        expect(events).toEqual([
          { name: 'step:start', args: [ { name: 'step' } ] },
          { name: 'executing', args: [] },
          { name: 'step:skip', args: [ { name: 'step' }, false, 'foo', 'bar' ] }
        ]);
      });
    });

    it("should emit `step:start` and `step:error` for a failed step", function() {

      var error = new Error('bug');
      scenario.step('step', function() { collector.add('executing'); return this.fail(error); });

      h.runScenario(scenario, false);

      runs(function() {
        expect(events).toEqual([
          { name: 'step:start', args: [ { name: 'step' } ] },
          { name: 'executing', args: [] },
          { name: 'step:error', args: [ { name: 'step' }, error ] }
        ]);
      });
    });

    it("should contain step arguments and return values", function() {

      var error = new Error('bug');
      scenario.step('step 0', function() { collector.add('executing step 0'); return this.success('foo'); });
      scenario.step('step 1', function() { collector.add('executing step 1'); return this.skip('skipped', 'bar', 'baz'); });
      scenario.step('step 2', function() { collector.add('executing step 2'); return this.fail(error); });

      h.runScenario(scenario, false);

      runs(function() {
        expect(events.length).toBe(9);
        expect(events[0]).toEqual({ name: 'step:start', args: [ { name: 'step 0' } ] });
        expect(events[1]).toEqual({ name: 'executing step 0', args: [] });
        expect(events[2]).toEqual({ name: 'step:done', args: [ { name: 'step 0' }, 'foo' ] });
        expect(events[3]).toEqual({ name: 'step:start', args: [ { name: 'step 1' }, 'foo' ] });
        expect(events[4]).toEqual({ name: 'executing step 1', args: [] });
        expect(events[5]).toEqual({ name: 'step:skip', args: [ { name: 'step 1' }, 'skipped', 'bar', 'baz' ] });
        expect(events[6]).toEqual({ name: 'step:start', args: [ { name: 'step 2' }, 'bar', 'baz' ] });
        expect(events[7]).toEqual({ name: 'executing step 2', args: [] });
        expect(events[8]).toEqual({ name: 'step:error', args: [ { name: 'step 2' }, error ] });
      });
    });
  });
});
