var _ = require('underscore'),
    events = require('events'),
    util = require('util');

function ScenarioMock(options) {
  _.extend(this, options);
  events.EventEmitter.call(this);
}

util.inherits(ScenarioMock, events.EventEmitter);

module.exports = ScenarioMock;
