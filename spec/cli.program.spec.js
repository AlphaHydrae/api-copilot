var _ = require('underscore'),
    cliProgramFactory = require('../lib/cli.program'),
    fsMock = require('./support/fs.mock'),
    h = require('./support/helpers'),
    q = require('q'),
    path = require('path'),
    pkg = require('../package'),
    slice = Array.prototype.slice,
    yaml = require('js-yaml');

var TRUTHY_STRINGS = [ '1', 'y', 'yes', 't', 'true' ],
    BOOLEAN_OPTIONS = [ 'showTime', 'showRequest', 'showResponseBody', 'showFullUrl' ];

describe("CLI Program", function() {

  var CliProgram, program, defaultOptions, mocks, handlerMocks;
  beforeEach(function() {

    h.addMatchers(this);
    fsMock.reset();

    defaultOptions = {
      source: 'api',
      config: [ '/home/.api-copilot.yml', 'api-copilot.yml' ]
    };

    mocks = {
      cliEnv: {
        HOME: '/home'
      }
    };

    var noop = function() {};
    CliProgram = cliProgramFactory(noop, noop, noop, mocks.cliEnv, fsMock);

    handlerMocks = {
      run: jasmine.createSpy(),
      info: jasmine.createSpy(),
      list: jasmine.createSpy()
    };

    program = new CliProgram(handlerMocks);
  });

  function execute() {
    var promise = program.execute([ 'node', 'bin', ].concat(slice.call(arguments)));
    return h.runPromise(promise, true);
  }

  function executeFailed() {
    var promise = program.execute([ 'node', 'bin', ].concat(slice.call(arguments)));
    return h.runPromise(promise, false);
  }

  function parsed(options) {
    return _.extend({}, defaultOptions, options);
  }

  function setEnvironment(options) {
    _.extend(mocks.cliEnv, options);
  }

  var cwd = process.cwd(),
      defaultConfigFile = path.resolve(cwd, 'api-copilot.yml');

  function setConfig(options, file) {
    fsMock.files[file ? path.resolve(cwd, file) : defaultConfigFile] = yaml.safeDump(options);
  }

  it("should output the help by default", function() {

    var output = h.capture(function() {
      execute();
    });

    expect(output.stdout).toMatch(/Usage:/);

    _.each(handlerMocks, function(spy) {
      expect(spy).not.toHaveBeenCalled();
    });
  });

  it("should return a resolved promise when outputting the help", function() {

    var fulfilledSpy;
    h.capture(function() {
      fulfilledSpy = execute();
    });

    runs(function() {
      expect(fulfilledSpy).toHaveBeenCalledWith(undefined);
    });
  });

  var subCommands = [
    { name: 'run', arity: 1 },
    { name: 'info', arity: 1 },
    { name: 'list', arity: 0 }
  ];

  _.each(subCommands, function(subCommand) {
    var command = subCommand.name;

    describe("`" + command + "` sub-command", function() {

      var spy, arity;
      beforeEach(function() {
        spy = handlerMocks[subCommand.name];
        arity = subCommand.arity;
      });

      function expectActionCalled(options, arg) {
        if (arity === 1) {
          expect(spy).toHaveBeenCalledWith(arg, options);
        } else if (arity === 0) {
          expect(spy).toHaveBeenCalledWith(options);
        } else {
          throw new Error('Unsupported arity ' + arity);
        }
      }

      it("should return a resolved promise when successful", function() {

        var handlers = {};
        handlers[command] = function() {
          return q(command + ' result');
        };

        program = new CliProgram(handlers);

        var fulfilledSpy = execute(command);

        runs(function() {
          expect(fulfilledSpy).toHaveBeenCalledWith(command + ' result');
        });
      });

      it("should return a resolved promise when the handler returns nothing", function() {

        var handlers = {};
        handlers[command] = function() {};

        program = new CliProgram(handlers);

        var fulfilledSpy = execute(command);

        runs(function() {
          expect(fulfilledSpy).toHaveBeenCalledWith(undefined);
        });
      });

      it("should return a rejected promise when failed", function() {

        var handlers = {};
        handlers[command] = function() {
          return q.reject(new Error(command + ' bug'));
        };

        program = new CliProgram(handlers);

        var rejectedSpy = executeFailed(command);

        runs(function() {
          expect(rejectedSpy).toHaveBeenCalled();
          expect(rejectedSpy.calls[0].args[0]).toBeAnError(command + ' bug');
        });
      });

      it("should produce the default options with no arguments, environment variables or configuration files", function() {
        execute(command);
        runs(function() {
          expectActionCalled(parsed());
        });
      });

      describe("command line", function() {

        it("should parse short command line options", function() {

          setConfig({}, 'foo.yml');
          setConfig({}, 'bar.yml');

          execute(
            '-l', 'debug', '-s', 'samples', '-u', 'http://example.com/foo', '-t', '-q', '-b',
            '-p', 'foo', '-p', 'bar=baz', '-p', 'baz=1', '-p', 'baz=2', '-p', 'baz=3',
            '-c', 'foo.yml', '-c', 'bar.yml', command
          );

          runs(function() {
            expectActionCalled(parsed({
              log: 'debug',
              source: 'samples',
              baseUrl: 'http://example.com/foo',
              showTime: true,
              showRequest: true,
              showResponseBody: true,
              params: { foo: [ true ], bar: [ 'baz' ], baz: [ '1', '2', '3' ] },
              config: [ 'foo.yml', 'bar.yml' ]
            }));
          });
        });

        it("should parse long command line options", function() {

          setConfig({}, 'foo.yml');
          setConfig({}, 'bar.yml');

          execute(
            '--log', 'trace', '--source', 'scripts', '--base-url', 'http://example.com/bar',
            '--show-time', '--show-request', '--show-response-body', '--show-full-url',
            '--request-pipeline', '3', '--request-cooldown', '250', '--request-delay', '100',
            '--params', 'foo', '--params', 'bar=baz', '--params', 'baz=1', '--params', 'baz=2', '--params', 'baz=3',
            '--config', 'foo.yml', '--config', 'bar.yml', command
          );

          runs(function() {
            expectActionCalled(parsed({
              log: 'trace',
              source: 'scripts',
              baseUrl: 'http://example.com/bar',
              showTime: true,
              showRequest: true,
              showResponseBody: true,
              showFullUrl: true,
              requestPipeline: 3,
              requestCooldown: 250,
              requestDelay: 100,
              params: { foo: [ true ], bar: [ 'baz' ], baz: [ '1', '2', '3' ] },
              config: [ 'foo.yml', 'bar.yml' ]
            }));
          });
        });

        it("should accept unknown log levels", function() {

          execute('--log', 'deebug', command);

          runs(function() {
            expectActionCalled(parsed({
              log: 'deebug'
            }));
          });
        });
        
        it("should coerce request pipeline options to integers", function() {

          execute('--request-pipeline', 'asd', '--request-cooldown', 'sdf', '--request-delay', 'dfg', command);

          runs(function() {
            expectActionCalled(jasmine.any(Object));

            var options = spy.calls[0].args[arity];
            expect(options.requestPipeline).toBeNaN();
            expect(options.requestCooldown).toBeNaN();
            expect(options.requestDelay).toBeNaN();
          });
        });
      });

      describe("environment variables", function() {

        var booleanEnvVars;
        beforeEach(function() {
          booleanEnvVars = [ 'API_COPILOT_SHOW_TIME', 'API_COPILOT_SHOW_REQUEST', 'API_COPILOT_SHOW_RESPONSE_BODY', 'API_COPILOT_SHOW_FULL_URL' ];
        });

        it("should parse options given through environment variables", function() {

          setConfig({}, 'foo.yml');

          setEnvironment({
            API_COPILOT_LOG: 'trace',
            API_COPILOT_SOURCE: 'samples',
            API_COPILOT_BASE_URL: 'http://example.com',
            API_COPILOT_SHOW_TIME: '1',
            API_COPILOT_SHOW_REQUEST: '1',
            API_COPILOT_SHOW_RESPONSE_BODY: '1',
            API_COPILOT_SHOW_FULL_URL: '1',
            API_COPILOT_REQUEST_PIPELINE: '3',
            API_COPILOT_REQUEST_COOLDOWN: '250',
            API_COPILOT_REQUEST_DELAY: '100',
            API_COPILOT_CONFIG: 'foo.yml',
            API_COPILOT_DEFAULT_CONFIGS: '1'
          });

          execute(command);

          runs(function() {
            expectActionCalled(parsed({
              log: 'trace',
              source: 'samples',
              baseUrl: 'http://example.com',
              showTime: true,
              showRequest: true,
              showResponseBody: true,
              showFullUrl: true,
              requestPipeline: 3,
              requestCooldown: 250,
              requestDelay: 100,
              config: defaultOptions.config.concat([ 'foo.yml' ]),
              defaultConfigs: true
            }));
          });
        });

        _.each(TRUTHY_STRINGS, function(truthy) {
          it("should parse " + truthy + " as true for boolean options", function() {

            setEnvironment(_.reduce(booleanEnvVars, function(memo, name) {
              memo[name] = truthy;
              return memo;
            }, {}));

            execute(command);

            runs(function() {
              expectActionCalled(parsed(_.reduce(BOOLEAN_OPTIONS, function(memo, name) {
                memo[name] = true;
                return memo;
              }, {})));
            });
          });
        });

        _.each([ '', 'n', 'no', 'f', 'false', 'anything' ], function(falsy) {
          it("should parse " + falsy + " as false for boolean options", function() {

            setEnvironment(_.reduce(booleanEnvVars, function(memo, name) {
              memo[name] = falsy;
              return memo;
            }, {}));

            execute(command);

            runs(function() {
              expectActionCalled(parsed(_.reduce(BOOLEAN_OPTIONS, function(memo, name) {
                memo[name] = false;
                return memo;
              }, {})));
            });
          });
        });
      });

      describe("configuration file", function() {

        it("should parse options from a YAML configuration file", function() {

          setConfig({
            log: 'debug',
            source: 'samples',
            baseUrl: 'http://example.com',
            showTime: true,
            showRequest: true,
            showResponseBody: true,
            showFullUrl: true,
            requestPipeline: 3,
            requestCooldown: 250,
            requestDelay: 100,
            params: {
              foo: true,
              bar: 'baz',
              baz: [ 1, 2, 3 ]
            }
          });

          execute(command);

          runs(function() {
            expectActionCalled(parsed({
              log: 'debug',
              source: 'samples',
              baseUrl: 'http://example.com',
              showTime: true,
              showRequest: true,
              showResponseBody: true,
              showFullUrl: true,
              requestPipeline: 3,
              requestCooldown: 250,
              requestDelay: 100,
              params: {
                foo: true,
                bar: 'baz',
                baz: [ 1, 2, 3 ]
              }
            }));
          });
        });

        it("should load the home configuration file", function() {

          setConfig({ log: 'trace' }, '/home/.api-copilot.yml');
          execute(command);

          runs(function() {
            expectActionCalled(parsed({ log: 'trace' }));
          });
        });

        it("should load multiple configuration files (and omit the default configuration files)", function() {

          setConfig({ log: 'trace', source: 'a', baseUrl: 'http://example.com/a', requestPipeline: 1 }, '/home/.api-copilot.yml');
          setConfig({ source: 'b', baseUrl: 'http://example.com/b', requestPipeline: 2 });
          setConfig({ baseUrl: 'http://example.com/c', requestPipeline: 3 }, 'foo.yml');
          setConfig({ requestPipeline: 4 }, 'bar.yml');
          execute('-c', 'foo.yml', '-c', 'bar.yml', command);

          runs(function() {
            expectActionCalled(parsed({
              baseUrl: 'http://example.com/c',
              requestPipeline: 4,
              config: [ 'foo.yml', 'bar.yml' ]
            }));
          });
        });

        it("should load the home and cwd configuration files with the `defaultConfigs` option", function() {

          setConfig({ log: 'trace', source: 'a', baseUrl: 'http://example.com/a', requestPipeline: 1 }, '/home/.api-copilot.yml');
          setConfig({ source: 'b', baseUrl: 'http://example.com/b', requestPipeline: 2 });
          setConfig({ baseUrl: 'http://example.com/c', requestPipeline: 3 }, 'foo.yml');
          setConfig({ requestPipeline: 4 }, 'bar.yml');
          execute('--default-configs', '-c', 'foo.yml', '-c', 'bar.yml', command);

          runs(function() {
            expectActionCalled(parsed({
              log: 'trace',
              source: 'b',
              baseUrl: 'http://example.com/c',
              requestPipeline: 4,
              config: defaultOptions.config.concat([ 'foo.yml', 'bar.yml' ])
            }));
          });
        });

        it("should not parse the config option", function() {

          setConfig({ config: 'foo.yml' });
          execute(command);

          runs(function() {
            expectActionCalled(parsed());
          });
        });

        it("should not parse unknown options", function() {

          setConfig({ foo: 'bar', baz: 'qux' });
          execute(command);

          runs(function() {
            expectActionCalled(parsed());
          });
        });
      });

      describe("combined", function() {

        it("should override configuration file options with command line options", function() {

          setConfig({ log: 'debug', source: 'foo', baseUrl: 'http://bar.com', requestPipeline: 2 });
          execute('-l', 'trace', '--source', 'baz', '--request-pipeline', '3', command);

          runs(function() {
            expectActionCalled(parsed({ log: 'trace', source: 'baz', baseUrl: 'http://bar.com', requestPipeline: 3 }));
          });
        });

        it("should override environment options with command line options", function() {

          setEnvironment({ API_COPILOT_LOG: 'trace', API_COPILOT_SOURCE: 'baz', API_COPILOT_BASE_URL: 'http://example.com', API_COPILOT_REQUEST_PIPELINE: '4' });
          execute('-l', 'debug', '--source', 'foo', '--request-pipeline', '1', command);

          runs(function() {
            expectActionCalled(parsed({ log: 'debug', source: 'foo', baseUrl: 'http://example.com', requestPipeline: 1 }));
          });
        });

        it("should override configuration file options with environment options and environment options with command line options", function() {

          setConfig({ source: 'foo', baseUrl: 'http://example.com/a', requestPipeline: 10 });
          setEnvironment({ API_COPILOT_BASE_URL: 'http://example.com/b', requestPipeline: '20' });
          execute('--request-pipeline', '30', '-l', 'debug', command);

          runs(function() {
            expectActionCalled(parsed({ source: 'foo', baseUrl: 'http://example.com/b', requestPipeline: 30, log: 'debug' }));
          });
        });

        it("should extend configuration file params and command line params", function() {

          setConfig({ params: { foo: 'a', bar: 'a', baz: 'a', qux: [ 'a', 'a' ] } }, '/home/.api-copilot.yml');
          setConfig({ params: { bar: 'b', baz: 'b', qux: [ 'b', 'b' ] } });
          setConfig({ params: { baz: [ 'c', 'd' ], qux: [ 'c' ] } }, 'foo.yml');
          execute('--default-configs', '-c', 'foo.yml', '-p', 'bar', '-p', 'qux=e', command);

          runs(function() {
            expectActionCalled(parsed({
              config: defaultOptions.config.concat([ 'foo.yml' ]),
              params: {
                foo: 'a',
                bar: [ true ],
                baz: [ 'c', 'd' ],
                qux: [ 'e' ]
              }
            }));
          });
        });
      });

      if (subCommand.arity) {
        describe("arguments", function() {

          it("should be parsed", function() {

            setConfig({ baseUrl: 'http://qux.com' });
            execute('-l', 'debug', command, 'foo.scenario.js');

            runs(function() {
              expectActionCalled(parsed({
                log: 'debug',
                baseUrl: 'http://qux.com'
              }), 'foo.scenario.js');
            });
          });
        });
      }
    });
  });

  describe("--help", function() {

    var lines;
    beforeEach(function() {

      var output = h.capture(function() {
        program.buildCommand().outputHelp();
      });

      lines = _.filter(output.stdout.split("\n"), function(line) {
        return line && line.trim().length;
      });
    });

    it("should show the usage notice", function() {
      expect(lines[0].trim()).toBe("Usage: api-copilot [options] [command]");
    });

    it("should show all sub-commands", function() {

      var commandsIndex = _.indexOf(lines, '  Commands:'),
          optionsIndex = _.indexOf(lines, '  Options:'),
          commands = cleanHelp(lines.slice(commandsIndex + 1, optionsIndex));

      expect(commands.length).toBe(3);
      expect(commands[0]).toBe('list list available API scenarios');
      expect(commands[1]).toBe('info [scenario] describe an API scenario');
      expect(commands[2]).toBe('run [scenario] run an API scenario');
    });

    it("should show all options", function() {

      var optionsIndex = _.indexOf(lines, '  Options:'),
          customParamsIndex = _.indexOf(lines, '  Custom Parameters:'),
          options = cleanHelp(lines.slice(optionsIndex + 1, customParamsIndex));

      expect(options.length).toBe(15);
      expect(options[0]).toBe('-h, --help output usage information');
      expect(options[1]).toBe('-V, --version output the version number');
      expect(options[2]).toBe('-l, --log [level] Log level (trace, debug, info; info by default)');
      expect(options[3]).toBe('-s, --source [dir] Directory where API scenarios are located ("api" by default)');
      expect(options[4]).toBe('-u, --base-url [url] (run) Override the base URL of the scenario');
      expect(options[5]).toBe('-p, --params [name] (run) Add a custom parameter (see Custom Parameters)');
      expect(options[6]).toBe('-t, --show-time (run) Print the date and time with each log');
      expect(options[7]).toBe('-q, --show-request (run) Print options for each HTTP request (only with debug or trace log level)');
      expect(options[8]).toBe('-b, --show-response-body (run) Print response body for each HTTP request (only with debug or trace log level)');
      expect(options[9]).toBe('--show-full-url (run) Show full URLs even when a base URL is configured (only with debug or trace log level)');
      expect(options[10]).toBe('--request-pipeline <n> (run) maximum number of HTTP requests to run in parallel (no limit by default)');
      expect(options[11]).toBe('--request-cooldown <ms> (run) if set and an HTTP request ends, no other request will be started before this time (milliseconds) has elapsed (no cooldown by default)');
      expect(options[12]).toBe('--request-delay <ms> (run) if set and an HTTP request starts, no other request will be started before this time (milliseconds) has elapsed (no delay by default)');
      expect(options[13]).toBe('-c, --config [file] Read options from a YAML configuration file (can be used multiple times; disables default configuration files)');
      expect(options[14]).toBe('--default-configs Combine default configuration files with custom ones ($HOME/.api-copilot.yml and api-copilot.yml)');
    });

    it("should show information about custom parameters", function() {

      var customParamsIndex = _.indexOf(lines, '  Custom Parameters:'),
          customParams = cleanHelp(lines.slice(customParamsIndex + 1));

      expect(customParams.length).toBe(2);
      expect(customParams[0]).toBe('The -p, --params option can be used multiple times to give custom parameters to a scenario.');
      expect(customParams[1]).toBe('api-copilot -p param1 -p param2=value -p param3=value');
    });
  });

  function cleanHelp(lines) {
    return _.map(lines, function(line) {
      return line.trim().replace(/ +/g, ' ');
    });
  }
});
