var colors = require('colors');

module.exports = function(CliProgram) {

  return function(argv) {

    var program = new CliProgram();
    program.execute(argv || process.argv).fail(function(err) {

      if (err) {
        console.log();
        console.warn(program.trace ? err.stack.yellow : err.message.yellow);
        console.log();
      }

      process.exit(2);
    });
  };
};

module.exports['@require'] = [ 'cli.program' ];
