module.exports = function() {
  return function() {
    console.log.apply(console, Array.prototype.slice.call(arguments));
  };
};

module.exports['@require'] = [];
