module.exports = function(Klass) {

  return function() {

    var Tmp = function(){};
    Tmp.prototype = Klass.prototype;
    var instance = new Tmp();
    Klass.apply(instance, Array.prototype.slice.call(arguments));

    return instance;
  };
};
