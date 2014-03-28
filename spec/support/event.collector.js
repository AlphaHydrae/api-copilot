var _ = require('underscore');

function EventCollector() {
  this.events = [];
}

_.extend(EventCollector.prototype, {

  collect: function(source) {
    var events = this.events;
    _.each(Array.prototype.slice.call(arguments, 1), function(name) {
      source.on(name, function() { events.push({ name: name, args: Array.prototype.slice.call(arguments) }); });
    });
  },

  add: function(name) {
    this.events.push({ name: name, args: Array.prototype.slice.call(arguments, 1) });
  }
});

module.exports = EventCollector;
