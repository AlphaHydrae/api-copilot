var Program = require('./cli.program')();

module.exports = function(argv) {
  new Program().execute(argv);
};
