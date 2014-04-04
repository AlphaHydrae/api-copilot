var _ = require('underscore'),
    path = require('path'),
    q = require('q'),
    yaml = require('js-yaml');

var pkg = require('../package'),
    LOG_LEVELS = [ 'trace', 'debug', 'info' ],
    OPTIONS = [ 'log', 'source', 'baseUrl', 'showTime', 'showRequest', 'showResponseBody', 'showFullUrl' ],
    PARAM_REGEXP = /^([^=]+)=(.*)$/;

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

      // build options: command options override configuration file options override default options
      var options = _.extend({}, this.defaultOptions, this.pickOptions(config), this.pickOptions(command));

      // make sure log level is valid, set to info otherwise
      options.log = options.log && _.contains(LOG_LEVELS, options.log.toString().toLowerCase()) ? options.log : 'info';

      // build custom parameters
      var params = _.extend({}, config.params, command.params);
      if (!_.isEmpty(params)) {
        options.params = params;
      }

      return {
        options: options,
        args: command.args
      };
    },

    parseCommandLineOptions: function(argv) {

      var command = new commander.Command();

      command
        .version(pkg.version)
        .option('-c, --config [file]', 'Set the configuration file path')
        .option('-l, --log [level]', 'Log level (trace, debug, info; info by default)')
        .option('-s, --source [dir]', 'Directory where API scenarios are located ("api" by default)')
        .option('-u, --base-url [url]', 'Override the base URL of the scenario')
        .option('-p, --params [name]', 'Add a custom parameter (see Custom Parameters)', _.bind(this.collectParams, this), {})
        .option('-t, --show-time', 'Print the date and time with each log')
        .option('-q, --show-request', 'Print options for each HTTP request (only with debug or trace log level)')
        .option('-b, --show-response-body', 'Print response body for each HTTP request (only with debug or trace log level)')
        .option('--show-full-url', 'Show full URLs even when a base URL is configured (only with debug or trace log level)');

      command.on('--help', function() {
        console.log('  Custom Parameters:');
        console.log();
        console.log('    The -p, --params option can be used multiple times to give custom parameters to a scenario.');
        console.log('      api-copilot -p param1 -p param2=value -p param3=value');
        console.log();
      });

      command.parse(argv);

      return command;
    },

    loadConfigurationFileOptions: function(options) {

      var configFile = path.resolve(process.cwd(), options.config || 'api-copilot.yml');

      if (fs.existsSync(configFile)) {
        return yaml.safeLoad(fs.readFileSync(configFile, { encoding: 'utf8' }));
      } else {
        return {};
      }
    },

    pickOptions: function(source) {
      return source ? _.pick.apply(_, [ source ].concat(OPTIONS)) : {};
    },

    collectParams: function(paramString, params) {

      var name = paramString,
          value = true;

      var match = PARAM_REGEXP.exec(name);
      if (match) {
        name = match[1];
        value = match[2];
      }

      params[name] = value;

      return params;
    }
  });

  return Command;
};
