var _ = require('underscore'),
    commander = require('commander'),
    inflection = require('inflection'),
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
    BOOLEAN_OPTIONS = [ 'showTime', 'showRequest', 'showResponseBody', 'showFullUrl', 'defaultConfigs' ],
    INTEGER_OPTIONS = [ 'requestPipeline', 'requestCooldown', 'requestDelay' ],
    PARAM_REGEXP = /^([^=]+)=(.*)$/;

module.exports = function(cliInfo, cliListing, cliRunner, cliEnv, fs) {

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

      var promise = q({});
      this.currentAction = name;

      // TODO: spec this
      this.setTrace(command);

      var envOptions = this.loadEnvironmentOptions();

      var configFiles = [];
      if (command.config.length) {
        configFiles = command.config;
      } else if (envOptions.config) {
        configFiles = [ envOptions.config ];
      }

      var defaultConfigs = command.defaultConfigs || envOptions.defaultConfigs,
          defaultConfigsCount = 0;
      if (!configFiles.length || defaultConfigs) {

        defaultConfigsCount++;
        configFiles.unshift('api-copilot.yml');

        var home = this.homeDirectory();
        if (home) {
          defaultConfigsCount++;
          configFiles.unshift(path.join(home, '.api-copilot.yml'));
        }
      }

      if (configFiles) {
        _.each(configFiles, function(file) {
          promise = promise.then(_.bind(this.loadConfigurationFileOptions, this, file, defaultConfigsCount-- <= 0));
        }, this);
      }

      var commandArgs = slice.call(arguments, 4, 4 + arity);

      promise.then(_.bind(function(configOptions) {
        this.executeHandler.apply(this, [ name, command, arity, envOptions, configFiles, configOptions, deferred ].concat(commandArgs));
      }, this), deferred.reject);
    },

    executeHandler: function(name, command, arity, envOptions, configFiles, configOptions, deferred) {

      var options = _.extend({}, this.defaultOptions, this.pickOptions(configOptions));
      options = merge(options, envOptions);
      options = merge(options, this.pickOptions(command));

      this.setTrace(options);

      options.config = configFiles;

      options.params = _.extend({}, configOptions.params, command.params);
      if (_.isEmpty(options.params)) {
        delete options.params;
      }

      var handler = this.handlers[name];
      if (!handler) {
        throw new Error('No handler found for command ' + name);
      } else if (typeof(handler) != 'function') {
        throw new Error('Handler "' + name + '" is not a function, got ' + typeof(handler));
      }

      var args = _.compact(slice.call(arguments, 7, 7 + arity));

      _.times(arity - args.length, function() {
        args.push(undefined);
      });

      args.push(options);

      q.when(handler.apply(undefined, args)).then(deferred.resolve, deferred.reject);
    },

    buildCommand: function(deferred) {

      var program = new commander.Command('api-copilot');

      program
        .version(pkg.version)
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
        .option('--request-delay <ms>', '(run) if set and an HTTP request starts, no other request will be started before this time (milliseconds) has elapsed (no delay by default)', parseInt)
        .option('-c, --config [file]', 'Read options from a YAML configuration file (can be used multiple times; disables default configuration files)', _.bind(this.collectFiles, this), [])
        .option('--default-configs', 'Combine default configuration files with custom ones ($HOME/.api-copilot.yml and api-copilot.yml)');

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

    loadConfigurationFileOptions: function(file, required, options) {
      file = path.resolve(file);

      return this.readConfigurationFile(file, required).then(function(configFileOptions) {
        if (!configFileOptions) {
          return options; // TODO: spec this
        } else if (!_.isObject(configFileOptions)) { // TODO: spec this
          throw new Error('Configuration file ' + file + ' does not contain valid options (expected an object, got ' + typeof(configFileOptions) + ')');
        }

        options = merge(options, configFileOptions);
        options.params = _.extend({}, options.params, configFileOptions.params);
        return options;
      });
    },

    readConfigurationFile: function(file, required) {

      var deferred = q.defer();
      fs.exists(file, function(exists) {
        if (!exists) { // TODO: spec this
          if (required) {
            return deferred.reject(new Error('No such configuration file ' + file));
          } else {
            return deferred.resolve();
          }
        }

        return q.nfcall(_.bind(fs.readFile, fs), file, { encoding: 'utf8' }).then(function(contents) {
          deferred.resolve(yaml.safeLoad(contents));
        }, deferred.reject);
      });

      return deferred.promise;
    },

    loadEnvironmentOptions: function() {

      var names = OPTIONS.concat([ 'config', 'defaultConfigs' ]);

      var options = _.reduce(names, function(memo, name) {

        var envName = 'API_COPILOT_' + inflection.underscore(name).toUpperCase();

        if (_.has(cliEnv, envName)) {
          memo[name] = cliEnv[envName];
        }

        return memo;
      }, {});

      _.each(BOOLEAN_OPTIONS, function(name) {
        if (_.has(options, name)) {
          options[name] = !!options[name].match(/^(1|y|yes|t|true)$/i);
        }
      });

      _.each(INTEGER_OPTIONS, function(name) {
        if (_.has(options, name) && _.isString(options[name])) {
          options[name] = parseInt(options[name], 10);
        }
      });

      return options;
    },

    pickOptions: function(source) {
      var names = OPTIONS.concat(slice.call(arguments, 1));
      return source ? _.pick.apply(_, [ source ].concat(names)) : {};
    },

    collectFiles: function(file, files) {
      files.push(file);
      return files;
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
    },

    homeDirectory: function() {
      return cliEnv.HOME || cliEnv.HOMEPATH || cliEnv.USERPROFILE;
    }
  });

  return Program;
};

module.exports['@singleton'] = true;
module.exports['@require'] = [ 'cli.info', 'cli.listing', 'cli.runner', 'cli.env', 'fs' ];
