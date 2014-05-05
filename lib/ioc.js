var ioc = require('electrolyte');

ioc.loader(function(id) {
  if (id.match(/^\./)) {
    return undefined;
  }

  try {
    var dep = require(id);
    return function() {
      return dep;
    };
  } catch (e) {
    return undefined;
  }
});

ioc.loader(ioc.node(__dirname));

module.exports = ioc;
