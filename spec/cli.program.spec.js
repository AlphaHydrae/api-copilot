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
      config: 'api-copilot.yml'
    };

    mocks = {
      cliEnv: {}
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
    return program.execute([ 'node', 'bin', ].concat(slice.call(arguments)));
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

    var promise;
    h.capture(function() {
      promise = execute();
    });

    var fulfilledSpy = jasmine.createSpy();
    promise.then(fulfilledSpy);

    waitsFor(function() {
      return fulfilledSpy.calls.length;
    }, "the program to have finished running", 50);

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

        var fulfilledSpy = jasmine.createSpy();
        execute(command).then(fulfilledSpy);

        waitsFor(function() {
          return fulfilledSpy.calls.length;
        }, "the program to have finished executing", 50);

        runs(function() {
          expect(fulfilledSpy).toHaveBeenCalledWith(command + ' result');
        });
      });

      it("should return a resolved promise when the handler returns nothing", function() {

        var handlers = {};
        handlers[command] = function() {};

        program = new CliProgram(handlers);

        var fulfilledSpy = jasmine.createSpy();
        execute(command).then(fulfilledSpy);

        waitsFor(function() {
          return fulfilledSpy.calls.length;
        }, "the program to have finished executing", 50);

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

        var rejectedSpy = jasmine.createSpy();
        execute(command).fail(rejectedSpy);

        waitsFor(function() {
          return rejectedSpy.calls.length;
        }, "the program to have finished executing", 50);

        runs(function() {
          expect(rejectedSpy).toHaveBeenCalled();
          expect(rejectedSpy.calls[0].args[0]).toBeAnError(command + ' bug');
        });
      });

      it("should produce the default options with no arguments, environment variables or configuration files", function() {
        execute(command);
        expectActionCalled(parsed());
      });

      describe("command line", function() {

        it("should parse the log option", function() {
          execute('-l', 'debug', command);
          expectActionCalled(parsed({ log: 'debug' }));
          execute('--log', 'trace', command);
          expectActionCalled(parsed({ log: 'trace' }));
        });

        it("should accept unknown log levels", function() {
          execute('-l', 'deebug', command);
          expectActionCalled(parsed({ log: 'deebug' }));
          execute('--log', 'traze', command);
          expectActionCalled(parsed({ log: 'traze' }));
        });

        it("should parse the source option", function() {
          execute('-s', 'foo', command);
          expectActionCalled(parsed({ source: 'foo' }));
          execute('--source', 'bar', command);
          expectActionCalled(parsed({ source: 'bar' }));
        });

        it("should parse the baseUrl option", function() {
          execute('-u', 'http://foo.com', command);
          expectActionCalled(parsed({ baseUrl: 'http://foo.com' }));
          execute('--base-url', 'http://bar.com', command);
          expectActionCalled(parsed({ baseUrl: 'http://bar.com' }));
        });

        it("should parse the showTime option", function() {
          execute('-t', command);
          expectActionCalled(parsed({ showTime: true }));
          execute('--show-time', command);
          expectActionCalled(parsed({ showTime: true }));
        });

        it("should parse the showRequest option", function() {
          execute('-q', command);
          expectActionCalled(parsed({ showRequest: true }));
          execute('--show-request', command);
          expectActionCalled(parsed({ showRequest: true }));
        });

        it("should parse the showResponseBody option", function() {
          execute('-b', command);
          expectActionCalled(parsed({ showResponseBody: true }));
          execute('--show-response-body', command);
          expectActionCalled(parsed({ showResponseBody: true }));
        });

        it("should parse the params option", function() {
          execute('-p', 'foo', command);
          expectActionCalled(parsed({ params: { foo: [ true ] } }));
          execute('--params', 'bar', command);
          expectActionCalled(parsed({ params: { bar: [ true ] } }));
        });

        it("should parse multiple params options", function() {
          execute('-p', 'foo', '--params', 'bar', '-p', 'baz', command);
          expectActionCalled(parsed({ params: { foo: [ true ], bar: [ true ], baz: [ true ] } }));
        });

        it("should parse key/value params options", function() {
          execute('-p', 'foo=bar', command);
          expectActionCalled(parsed({ params: { foo: [ 'bar' ] } }));
          execute('--params', 'baz=qux', command);
          expectActionCalled(parsed({ params: { baz: [ 'qux' ] } }));
        });

        it("should parse repeated params options", function() {
          execute('-p', 'foo', '-p', 'bar=abc', '--params', 'foo', '-p', 'bar=def', '--params', 'bar=ghi', '-p', 'qux=corge', command);
          expectActionCalled(parsed({ params: { foo: [ true, true ], bar: [ 'abc', 'def', 'ghi' ], qux: [ 'corge' ] } }));
        });

        it("should parse mixed params options", function() {
          execute('-p', 'foo=bar', '-p', 'baz', '--params', 'qux=corge', command);
          expectActionCalled(parsed({ params: { foo: [ 'bar' ], baz: [ true ], qux: [ 'corge' ] } }));
        });

        it("should parse the request pipeline options", function() {
          execute('--request-pipeline', '3', '--request-cooldown', '250', '--request-delay', '350', command);
          expectActionCalled(parsed({ requestPipeline: 3, requestCooldown: 250, requestDelay: 350 }));
        });

        it("should coerce the request pipeline options to integers", function() {
          execute('--request-pipeline', 'asd', '--request-cooldown', 'sdf', '--request-delay', 'dfg', command);
          expectActionCalled(jasmine.any(Object));

          var options = spy.calls[0].args[arity];
          expect(options.requestPipeline).toBeNaN();
          expect(options.requestCooldown).toBeNaN();
          expect(options.requestDelay).toBeNaN();
        });

        it("should parse the config option", function() {
          execute('-c', 'foo.yml', command);
          expectActionCalled(parsed({ config: 'foo.yml' }));
          execute('--config', 'bar.yml', command);
          expectActionCalled(parsed({ config: 'bar.yml' }));
        });
      });

      describe("environment variables", function() {

        var booleanEnvVars;
        beforeEach(function() {
          booleanEnvVars = [ 'API_COPILOT_SHOW_TIME', 'API_COPILOT_SHOW_REQUEST', 'API_COPILOT_SHOW_RESPONSE_BODY', 'API_COPILOT_SHOW_FULL_URL' ];
        });

        it("should parse options given through environment variables", function() {

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
            API_COPILOT_CONFIG: 'foo.yml'
          });

          execute(command);

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
            config: 'foo.yml'
          }));
        });

        _.each(TRUTHY_STRINGS, function(truthy) {
          it("should parse " + truthy + " as true for boolean options", function() {

            setEnvironment(_.reduce(booleanEnvVars, function(memo, name) {
              memo[name] = truthy;
              return memo;
            }, {}));

            execute(command);

            expectActionCalled(parsed(_.reduce(BOOLEAN_OPTIONS, function(memo, name) {
              memo[name] = true;
              return memo;
            }, {})));
          });
        });

        _.each([ '', 'n', 'no', 'f', 'false', 'anything' ], function(falsy) {
          it("should parse " + falsy + " as false for boolean options", function() {

            setEnvironment(_.reduce(booleanEnvVars, function(memo, name) {
              memo[name] = falsy;
              return memo;
            }, {}));

            execute(command);

            expectActionCalled(parsed(_.reduce(BOOLEAN_OPTIONS, function(memo, name) {
              memo[name] = false;
              return memo;
            }, {})));
          });
        });
      });

      describe("configuration file", function() {

        it("should parse the log option", function() {
          setConfig({ log: 'debug' });
          execute(command);
          expectActionCalled(parsed({ log: 'debug' }));
        });

        it("should not accept unknown log levels", function() {
          _.each([ 'foo', 'bar', 'baz', 'traze' ], function(unknownLogLevel) {
            setConfig({ log: unknownLogLevel });
            execute(command);
            expectActionCalled(parsed({ log: unknownLogLevel }));
          });
        });

        it("should parse the source option", function() {
          setConfig({ source: 'foo' });
          execute(command);
          expectActionCalled(parsed({ source: 'foo' }));
        });

        it("should parse the baseUrl option", function() {
          setConfig({ baseUrl: 'http://foo.com' });
          execute(command);
          expectActionCalled(parsed({ baseUrl: 'http://foo.com' }));
        });

        it("should parse the showTime option", function() {
          setConfig({ showTime: true });
          execute(command);
          expectActionCalled(parsed({ showTime: true }));
        });

        it("should parse the showRequest option", function() {
          setConfig({ showRequest: true });
          execute(command);
          expectActionCalled(parsed({ showRequest: true }));
        });

        it("should parse the showResponseBody option", function() {
          setConfig({ showResponseBody: true });
          execute(command);
          expectActionCalled(parsed({ showResponseBody: true }));
        });

        it("should parse the params option", function() {
          setConfig({ params: { foo: true, bar: 'string', baz: [ 1, 2, 3 ] } });
          execute(command);
          expectActionCalled(parsed({ params: { foo: true, bar: 'string', baz: [ 1, 2, 3 ] } }));
        });

        it("should parse the request pipeline options", function() {
          setConfig({ requestPipeline: 3, requestCooldown: 250, requestDelay: 350 });
          execute(command);
          expectActionCalled(parsed({ requestPipeline: 3, requestCooldown: 250, requestDelay: 350 }));
        });

        it("should not coerce request pipeline options", function() {
          setConfig({ requestPipeline: 'asd', requestCooldown: 'sdf', requestDelay: 'dfg' });
          execute(command);
          expectActionCalled(parsed({ requestPipeline: 'asd', requestCooldown: 'sdf', requestDelay: 'dfg' }));
        });

        it("should not parse the config option", function() {
          setConfig({ config: 'foo' });
          execute(command);
          expectActionCalled(parsed());
        });

        it("should load the configuration from the file given in the config option", function() {
          setConfig({ log: 'debug' });
          setConfig({ log: 'trace' }, 'foo.yml');
          execute('-c', 'foo.yml', command);
          expectActionCalled(parsed({ log: 'trace', config: 'foo.yml' }));
          execute('--config', 'foo.yml', command);
          expectActionCalled(parsed({ log: 'trace', config: 'foo.yml' }));
        });

        it("should not parse unknown options", function() {
          setConfig({ foo: 'bar', baz: 'qux' });
          execute(command);
          expectActionCalled(parsed());
        });
      });

      describe("combined", function() {

        it("should override configuration file options with command line options", function() {
          setConfig({ log: 'debug', source: 'foo', baseUrl: 'http://bar.com', requestPipeline: 2 });
          execute('-l', 'trace', '--source', 'baz', '--request-pipeline', '3', command);
          expectActionCalled(parsed({ log: 'trace', source: 'baz', baseUrl: 'http://bar.com', requestPipeline: 3 }));
        });

        it("should override environment options with command line options", function() {
          setEnvironment({ API_COPILOT_LOG: 'trace', API_COPILOT_SOURCE: 'baz', API_COPILOT_BASE_URL: 'http://example.com', API_COPILOT_REQUEST_PIPELINE: '4' });
          execute('-l', 'debug', '--source', 'foo', '--request-pipeline', '1', command);
          expectActionCalled(parsed({ log: 'debug', source: 'foo', baseUrl: 'http://example.com', requestPipeline: 1 }));
        });

        it("should override configuration file options with environment options and environment options with command line options", function() {
          setConfig({ source: 'foo', baseUrl: 'http://example.com/a', requestPipeline: 10 });
          setEnvironment({ API_COPILOT_BASE_URL: 'http://example.com/b', requestPipeline: '20' });
          execute('--request-pipeline', '30', '-l', 'debug', command);
          expectActionCalled(parsed({ source: 'foo', baseUrl: 'http://example.com/b', requestPipeline: 30, log: 'debug' }));
        });

        it("should extend configuration file params with command line params", function() {
          setConfig({ params: { foo: 'a', bar: 'b', baz: [ 1, 2 ], qux: 'string' } });
          execute('-p', 'foo', '-p', 'bar=1', '-p', 'bar=2', '-p', 'bar=3', '-p', 'baz=yeehaw', '-p', 'corge', command);
          expectActionCalled(parsed({ params: { foo: [ true ], bar: [ '1', '2', '3' ], baz: [ 'yeehaw' ], qux: 'string', corge: [ true ] } }));
        });
      });

      if (subCommand.arity) {
        describe("arguments", function() {

          it("should be parsed", function() {
            setConfig({ baseUrl: 'http://qux.com' });
            execute('-l', 'debug', command, 'foo.scenario.js');
            expectActionCalled(parsed({
              log: 'debug',
              baseUrl: 'http://qux.com'
            }), 'foo.scenario.js');
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

      expect(options.length).toBe(14);
      expect(options[0]).toBe('-h, --help output usage information');
      expect(options[1]).toBe('-V, --version output the version number');
      expect(options[2]).toBe('-c, --config [file] Set the configuration file path');
      expect(options[3]).toBe('-l, --log [level] Log level (trace, debug, info; info by default)');
      expect(options[4]).toBe('-s, --source [dir] Directory where API scenarios are located ("api" by default)');
      expect(options[5]).toBe('-u, --base-url [url] (run) Override the base URL of the scenario');
      expect(options[6]).toBe('-p, --params [name] (run) Add a custom parameter (see Custom Parameters)');
      expect(options[7]).toBe('-t, --show-time (run) Print the date and time with each log');
      expect(options[8]).toBe('-q, --show-request (run) Print options for each HTTP request (only with debug or trace log level)');
      expect(options[9]).toBe('-b, --show-response-body (run) Print response body for each HTTP request (only with debug or trace log level)');
      expect(options[10]).toBe('--show-full-url (run) Show full URLs even when a base URL is configured (only with debug or trace log level)');
      expect(options[11]).toBe('--request-pipeline <n> (run) maximum number of HTTP requests to run in parallel (no limit by default)');
      expect(options[12]).toBe('--request-cooldown <ms> (run) if set and an HTTP request ends, no other request will be started before this time (milliseconds) has elapsed (no cooldown by default)');
      expect(options[13]).toBe('--request-delay <ms> (run) if set and an HTTP request starts, no other request will be started before this time (milliseconds) has elapsed (no delay by default)');
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
