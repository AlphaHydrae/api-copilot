var _ = require('underscore'),
    path = require('path'),
    q = require('q'),
    yaml = require('js-yaml');

var pkg = require('../package'),
    LOG_LEVELS = [ 'trace', 'debug', 'info' ],
    OPTIONS = [ 'log', 'source', 'baseUrl', 'showTime', 'showRequest', 'showResponseBody', 'showFullUrl' ];

exports.inject = function(deps) {

  deps = deps || {};
  var commander = deps.commander || require('commander'),
      fs = deps.fs || require('fs');

  function Command() {
  }

  _.extend(Command.prototype, {

    defaultOptions: {
      log: 'info',
      source: 'api'
    },

    parse: function(argv) {

      var command = this.parseCommandLineOptions(argv),
          config = this.loadConfigurationFileOptions(command);

      var options = _.extend({}, this.defaultOptions, this.pickOptions(config), this.pickOptions(command));
      options.log = options.log && _.contains(LOG_LEVELS, options.log.toString().toLowerCase()) ? options.log : 'info';

      return {
        options: options,
        args: command.args
      };
    },

    parseCommandLineOptions: function(argv) {

      var command = new commander.Command();

      command
        .version(pkg.version)
        .option('-l, --log [level]', 'Log level (trace, debug, info; info by default)')
        .option('-s, --source [dir]', 'Directory where API scenarios are located ("api" by default)')
        .option('-u, --base-url [url]', 'Override the base URL of the scenario')
        .option('-c, --config [file]', 'Set the configuration file path')
        .option('-t, --show-time', 'Print the date and time with each log')
        .option('-q, --show-request', 'Print options for each HTTP request (only with debug or trace log level)')
        .option('-b, --show-response-body', 'Print response body for each HTTP request (only with debug or trace log level)')
        .option('--show-full-url', 'Show full URLs even when a base URL is configured (only with debug or trace log level)')
        .parse(argv);

      return command;
    },

    loadConfigurationFileOptions: function(options) {

      var configFile = path.resolve(process.cwd(), options.config || 'api-copilot.yml');

      if (fs.existsSync(configFile)) {
        return yaml.safeLoad(fs.readFileSync(configFile, { encoding: 'utf8' }));
      }
    },

    pickOptions: function(source) {
      return source ? _.pick.apply(_, [ source ].concat(OPTIONS)) : {};
    }
  });

  return Command;
};
