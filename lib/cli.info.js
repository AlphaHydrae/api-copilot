var _ = require('underscore'),
    slice = Array.prototype.slice;

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

  // TODO: make generic handler
  Info.handler = function() {
    return function(options) {
      var info = new Info(options);
      info.execute.apply(info, slice.call(arguments, 1));
    };
  };

  return Info;
};
