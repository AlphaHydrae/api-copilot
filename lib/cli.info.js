var _ = require('underscore'),
    slice = Array.prototype.slice;

var handlers = require('./handlers');

module.exports = function(deps) {

  deps = deps || {};

  function Info(options) {
    this.options = options;
  }

  _.extend(Info.prototype, {

    execute: function(scenario) {
      console.log('info not yet implemented');
    }
  });

  handlers.makeHandler(Info);

  return Info;
};
