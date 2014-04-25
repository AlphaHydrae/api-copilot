exports.makeHandler = function(klass) {
  klass.handler = function() {
    return function(options) {
      var instance = new klass(options);
      return instance.execute.apply(instance, Array.prototype.slice.call(arguments, 1));
    };
  };
};
