var _ = require('underscore'),
    cliProgramFactory = require('../lib/cli.program'),
    fsMock = require('./support/fs.mock'),
    h = require('./support/helpers'),
    q = require('q'),
    path = require('path'),
    pkg = require('../package'),
    slice = Array.prototype.slice,
    yaml = require('js-yaml');

describe("CLI Program", function() {

  var CliProgram, program, defaultOptions, mocks, handlerMocks;
  beforeEach(function() {

    h.addMatchers(this);
    fsMock.reset();

    defaultOptions = {
      log: 'info',
      source: 'api',
      config: 'api-copilot.yml'
    };

    var noop = function() {};
    CliProgram = cliProgramFactory(noop, noop, noop, fsMock);

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

      it("should produce the default options with no arguments", function() {
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

        it("should not accept unknown log levels with the short log option", function() {

          _.each([ 'foo', 'bar', 'baz', 'traze' ], function(unknownLogLevel) {
            execute('-l', unknownLogLevel, command);
            execute('--log', unknownLogLevel, command);
          });

          expect(spy.calls.length).toBe(8);

          _.times(8, function(i) {

            var args = [];
            if (arity === 1) {
              args.push(undefined);
            }

            args.push(parsed());

            expect(spy.calls[i].args).toEqual(args);
          });
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
          expectActionCalled(parsed({ params: { foo: true } }));
          execute('--params', 'bar', command);
          expectActionCalled(parsed({ params: { bar: true } }));
        });

        it("should parse multiple params options", function() {
          execute('-p', 'foo', '--params', 'bar', '-p', 'baz', command);
          expectActionCalled(parsed({ params: { foo: true, bar: true, baz: true } }));
        });

        it("should parse key/value params options", function() {
          execute('-p', 'foo=bar', command);
          expectActionCalled(parsed({ params: { foo: 'bar' } }));
          execute('--params', 'baz=qux', command);
          expectActionCalled(parsed({ params: { baz: 'qux' } }));
        });

        it("should parse mixed params options", function() {
          execute('-p', 'foo=bar', '-p', 'baz', '--params', 'qux=corge', command);
          expectActionCalled(parsed({ params: { foo: 'bar', baz: true, qux: 'corge' } }));
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

        it("should override configuration file options", function() {
          setConfig({ log: 'debug', source: 'foo', baseUrl: 'http://bar.com', requestPipeline: 2 });
          execute('-l', 'trace', '--source', 'baz', '-u', 'http://qux.com', '--request-pipeline', '3', command);
          expectActionCalled(parsed({ log: 'trace', source: 'baz', baseUrl: 'http://qux.com', requestPipeline: 3 }));
        });

        it("should merge configuration file params", function() {
          setConfig({ params: { foo: 'bar', baz: 'qux' } });
          execute('-p', 'baz=corge', '--params', 'grault', command);
          expectActionCalled(parsed({ params: { foo: 'bar', baz: 'corge', grault: true } }));
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
            expectActionCalled(parsed());
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
          setConfig({ params: { foo: 'bar' } });
          execute(command);
          expectActionCalled(parsed({ params: { foo: 'bar' } }));
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
