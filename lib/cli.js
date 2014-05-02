var colors = require('colors'),
    Program = require('./cli.program')();

module.exports = function(argv) {

  var program = new Program();
  program.execute(argv || process.argv).fail(function(err) {

    if (err) {
      console.log();
      console.warn(program.trace ? err.stack.yellow : err.message.yellow);
      console.log();
    }

    process.exit(2);
  });
};
