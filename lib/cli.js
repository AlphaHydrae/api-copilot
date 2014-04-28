var colors = require('colors'),
    Program = require('./cli.program')();

module.exports = function(argv) {
  // TODO: log errors here (taking into account trace log level)
  new Program().execute(argv).fail(function(err) {
    process.exit(2);
  });
};
