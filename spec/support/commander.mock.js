var _ = require('underscore');

var commandInstances = [];

function Command() {

  commandInstances.push(this);

  _.each([ 'version', 'option', 'parse' ], function(method) {
    spyOn(this, method).andCallThrough();
  }, this);
}

_.extend(Command.prototype, {

  version: function() {
    return this;
  },

  option: function() {
    return this;
  },

  parse: function() {
  }
});

exports.Command = Command;

exports.reset = function() {
  commandInstances.length = 0;
};

exports.commandInstances = commandInstances;
