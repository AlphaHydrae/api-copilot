var _ = require('underscore'),
    commander = require('commander'),
    merge = require('deepmerge'),
    path = require('path'),
    pkg = require('../package'),
    q = require('q'),
    slice = Array.prototype.slice,
    yaml = require('js-yaml');

var OPTIONS = [
      'log', 'source', 'baseUrl',
      'showTime', 'showRequest', 'showResponseBody', 'showFullUrl',
      'requestPipeline', 'requestCooldown', 'requestDelay'
    ],
    PARAM_REGEXP = /^([^=]+)=(.*)$/;

module.exports = function(cliInfo, cliListing, cliRunner, fs) {

  function Program(handlers) {
    this.handlers = _.defaults({}, handlers, {
      info: cliInfo,
      list: cliListing,
      run: cliRunner
    });
  }

  _.extend(Program.prototype, {

    defaultOptions: {
      source: 'api',
      config: 'api-copilot.yml'
    },

    execute: function(argv) {
      delete this.currentAction;

      var deferred = q.defer(),
          command = this.buildCommand(deferred);

      command.parse(argv);

      if (!this.currentAction) {
        deferred.resolve();
        command.outputHelp();
      }

      return deferred.promise;
    },

    executeAction: function(name, command, arity, deferred) {

      this.currentAction = name;

      // TODO: spec this
      this.setTrace(command);

      var config = this.loadConfigurationFileOptions(command);

      var options = merge(_.extend({}, this.defaultOptions, this.pickOptions(config)), this.pickOptions(command, 'config'));

      this.setTrace(options);

      options.params = _.extend({}, config.params, command.params);
      if (_.isEmpty(options.params)) {
        delete options.params;
      }

      var handler = this.handlers[name];
      if (!handler) {
        throw new Error('No handler found for command ' + name);
      } else if (typeof(handler) != 'function') {
        throw new Error('Handler "' + name + '" is not a function, got ' + typeof(handler));
      }

      var args = _.compact(slice.call(arguments, 4, 4 + arity));

      _.times(arity - args.length, function() {
        args.push(undefined);
      });

      args.push(options);

      q.when(handler.apply(undefined, args)).then(_.bind(deferred.resolve, deferred), _.bind(deferred.reject, deferred));
    },

    buildCommand: function(deferred) {

      var program = new commander.Command('api-copilot');

      program
        .version(pkg.version)
        .option('-c, --config [file]', 'Set the configuration file path')
        .option('-l, --log [level]', 'Log level (trace, debug, info; info by default)')
        .option('-s, --source [dir]', 'Directory where API scenarios are located ("api" by default)')
        .option('-u, --base-url [url]', '(run) Override the base URL of the scenario')
        .option('-p, --params [name]', '(run) Add a custom parameter (see Custom Parameters)', _.bind(this.collectParams, this), {})
        .option('-t, --show-time', '(run) Print the date and time with each log')
        .option('-q, --show-request', '(run) Print options for each HTTP request (only with debug or trace log level)')
        .option('-b, --show-response-body', '(run) Print response body for each HTTP request (only with debug or trace log level)')
        .option('--show-full-url', '(run) Show full URLs even when a base URL is configured (only with debug or trace log level)')
        .option('--request-pipeline <n>', '(run) maximum number of HTTP requests to run in parallel (no limit by default)', parseInt)
        .option('--request-cooldown <ms>', '(run) if set and an HTTP request ends, no other request will be started before this time (milliseconds) has elapsed (no cooldown by default)', parseInt)
        .option('--request-delay <ms>', '(run) if set and an HTTP request starts, no other request will be started before this time (milliseconds) has elapsed (no delay by default)', parseInt);

      program
        .command('list')
        .description('list available API scenarios')
        .action(_.bind(this.executeAction, this, 'list', program, 0, deferred));

      program
        .command('info [scenario]')
        .description('describe an API scenario')
        .action(_.bind(this.executeAction, this, 'info', program, 1, deferred));

      program
        .command('run [scenario]')
        .description('run an API scenario')
        .action(_.bind(this.executeAction, this, 'run', program, 1, deferred));

      program.on('--help', function() {
        console.log('  Custom Parameters:');
        console.log();
        console.log('    The -p, --params option can be used multiple times to give custom parameters to a scenario.');
        console.log('      api-copilot -p param1 -p param2=value -p param3=value');
        console.log();
      });

      return program;
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
      var names = OPTIONS.concat(slice.call(arguments, 1));
      return source ? _.pick.apply(_, [ source ].concat(names)) : {};
    },

    collectParams: function(paramString, params) {

      var name = paramString,
          value = true;

      var match = PARAM_REGEXP.exec(name);
      if (match) {
        name = match[1];
        value = match[2];
      }

      params[name] = params[name] || [];
      params[name].push(value);

      return params;
    },

    setTrace: function(source) {
      this.trace = _.isString(source.log) && source.log.toLowerCase() == 'trace';
    }
  });

  return Program;
};

module.exports['@singleton'] = true;
module.exports['@require'] = [ 'cli.info', 'cli.listing', 'cli.runner', 'fs' ];
