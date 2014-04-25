var _ = require('underscore'),
    path = require('path'),
    slice = Array.prototype.slice,
    yaml = require('js-yaml');

describe("CLI Program", function() {

  var fsMock = require('./support/fs.mock'),
      programInjector = require('../lib/cli.program'),
      pkg = require('../package');

  var program, defaultOptions, runSpy, infoSpy, listSpy, spies;
  beforeEach(function() {

    fsMock.reset();

    defaultOptions = {
      log: 'info',
      source: 'api'
    };

    Program = programInjector({
      fs: fsMock
    });

    runSpy = jasmine.createSpy();
    infoSpy = jasmine.createSpy();
    listSpy = jasmine.createSpy();

    spies = {
      run: runSpy,
      info: infoSpy,
      list: listSpy
    };

    program = new Program(spies);
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

  var subCommands = [
    { name: 'run', minArgs: 0, maxArgs: 1 },
    { name: 'info', minArgs: 0, maxArgs: 1 },
    { name: 'list', minArgs: 0, maxArgs: 0 }
  ];

  it("should output the help by default", function() {

    var output = capture(function() {
      execute();
    });

    expect(output).toMatch(/Usage:/);

    _.each(spies, function(spy) {
      expect(spy).not.toHaveBeenCalled();
    });
  });

  _.each(subCommands, function(subCommand) {
    var command = subCommand.name;

    describe("`" + command + "` sub-command", function() {

      var spy;
      beforeEach(function() {
        spy = spies[subCommand.name];
      });

      it("should produce the default options with no arguments", function() {
        execute(command);
        expect(spy).toHaveBeenCalledWith(parsed());
      });

      describe("command line", function() {

        it("should parse the log option", function() {
          execute('-l', 'debug', command);
          expect(spy).toHaveBeenCalledWith(parsed({ log: 'debug' }));
          execute('--log', 'trace', command);
          expect(spy).toHaveBeenCalledWith(parsed({ log: 'trace' }));
        });

        it("should not accept unknown log levels with the short log option", function() {

          _.each([ 'foo', 'bar', 'baz', 'traze' ], function(unknownLogLevel) {
            execute('-l', unknownLogLevel, command);
            execute('--log', unknownLogLevel, command);
          });

          expect(spy.calls.length).toBe(8);

          _.times(8, function(i) {
            expect(spy.calls[i].args).toEqual([ parsed() ]);
          });
        });

        it("should parse the source option", function() {
          execute('-s', 'foo', command);
          expect(spy).toHaveBeenCalledWith(parsed({ source: 'foo' }));
          execute('--source', 'bar', command);
          expect(spy).toHaveBeenCalledWith(parsed({ source: 'bar' }));
        });

        it("should parse the baseUrl option", function() {
          execute('-u', 'http://foo.com', command);
          expect(spy).toHaveBeenCalledWith(parsed({ baseUrl: 'http://foo.com' }));
          execute('--base-url', 'http://bar.com', command);
          expect(spy).toHaveBeenCalledWith(parsed({ baseUrl: 'http://bar.com' }));
        });

        it("should parse the showTime option", function() {
          execute('-t', command);
          expect(spy).toHaveBeenCalledWith(parsed({ showTime: true }));
          execute('--show-time', command);
          expect(spy).toHaveBeenCalledWith(parsed({ showTime: true }));
        });

        it("should parse the showRequest option", function() {
          execute('-q', command);
          expect(spy).toHaveBeenCalledWith(parsed({ showRequest: true }));
          execute('--show-request', command);
          expect(spy).toHaveBeenCalledWith(parsed({ showRequest: true }));
        });

        it("should parse the showResponseBody option", function() {
          execute('-b', command);
          expect(spy).toHaveBeenCalledWith(parsed({ showResponseBody: true }));
          execute('--show-response-body', command);
          expect(spy).toHaveBeenCalledWith(parsed({ showResponseBody: true }));
        });

        it("should parse the params option", function() {
          execute('-p', 'foo', command);
          expect(spy).toHaveBeenCalledWith(parsed({ params: { foo: true } }));
          execute('--params', 'bar', command);
          expect(spy).toHaveBeenCalledWith(parsed({ params: { bar: true } }));
        });

        it("should parse multiple params options", function() {
          execute('-p', 'foo', '--params', 'bar', '-p', 'baz', command);
          expect(spy).toHaveBeenCalledWith(parsed({ params: { foo: true, bar: true, baz: true } }));
        });

        it("should parse key/value params options", function() {
          execute('-p', 'foo=bar', command);
          expect(spy).toHaveBeenCalledWith(parsed({ params: { foo: 'bar' } }));
          execute('--params', 'baz=qux', command);
          expect(spy).toHaveBeenCalledWith(parsed({ params: { baz: 'qux' } }));
        });

        it("should parse mixed params options", function() {
          execute('-p', 'foo=bar', '-p', 'baz', '--params', 'qux=corge', command);
          expect(spy).toHaveBeenCalledWith(parsed({ params: { foo: 'bar', baz: true, qux: 'corge' } }));
        });

        it("should not parse the config option", function() {
          execute('-c', 'foo.yml', command);
          expect(spy).toHaveBeenCalledWith(parsed());
          execute('--config', 'bar.yml', command);
          expect(spy).toHaveBeenCalledWith(parsed());
        });

        it("should override configuration file options", function() {
          setConfig({ log: 'debug', source: 'foo', baseUrl: 'http://bar.com' });
          execute('-l', 'trace', '--source', 'baz', '-u', 'http://qux.com', command);
          expect(spy).toHaveBeenCalledWith(parsed({ log: 'trace', source: 'baz', baseUrl: 'http://qux.com' }));
        });

        it("should merge configuration file params", function() {
          setConfig({ params: { foo: 'bar', baz: 'qux' } });
          execute('-p', 'baz=corge', '--params', 'grault', command);
          expect(spy).toHaveBeenCalledWith(parsed({ params: { foo: 'bar', baz: 'corge', grault: true } }));
        });
      });

      describe("configuration file", function() {

        it("should parse the log option", function() {
          setConfig({ log: 'debug' });
          execute(command);
          expect(spy).toHaveBeenCalledWith(parsed({ log: 'debug' }));
        });

        it("should not accept unknown log levels", function() {
          _.each([ 'foo', 'bar', 'baz', 'traze' ], function(unknownLogLevel) {
            setConfig({ log: unknownLogLevel });
            execute(command);
            expect(spy).toHaveBeenCalledWith(parsed());
          });
        });

        it("should parse the source option", function() {
          setConfig({ source: 'foo' });
          execute(command);
          expect(spy).toHaveBeenCalledWith(parsed({ source: 'foo' }));
        });

        it("should parse the baseUrl option", function() {
          setConfig({ baseUrl: 'http://foo.com' });
          execute(command);
          expect(spy).toHaveBeenCalledWith(parsed({ baseUrl: 'http://foo.com' }));
        });

        it("should parse the showTime option", function() {
          setConfig({ showTime: true });
          execute(command);
          expect(spy).toHaveBeenCalledWith(parsed({ showTime: true }));
        });

        it("should parse the showRequest option", function() {
          setConfig({ showRequest: true });
          execute(command);
          expect(spy).toHaveBeenCalledWith(parsed({ showRequest: true }));
        });

        it("should parse the showResponseBody option", function() {
          setConfig({ showResponseBody: true });
          execute(command);
          expect(spy).toHaveBeenCalledWith(parsed({ showResponseBody: true }));
        });

        it("should parse the params option", function() {
          setConfig({ params: { foo: 'bar' } });
          execute(command);
          expect(spy).toHaveBeenCalledWith(parsed({ params: { foo: 'bar' } }));
        });

        it("should not parse the config option", function() {
          setConfig({ config: 'foo' });
          execute(command);
          expect(spy).toHaveBeenCalledWith(parsed());
        });

        it("should load the configuration from the file given in the config option", function() {
          setConfig({ log: 'debug' });
          setConfig({ log: 'trace' }, 'foo.yml');
          execute('-c', 'foo.yml', command);
          expect(spy).toHaveBeenCalledWith(parsed({ log: 'trace' }));
          execute('--config', 'foo.yml', command);
          expect(spy).toHaveBeenCalledWith(parsed({ log: 'trace' }));
        });

        it("should not parse unknown options", function() {
          setConfig({ foo: 'bar', baz: 'qux' });
          execute(command);
          expect(spy).toHaveBeenCalledWith(parsed());
        });
      });

      if (subCommand.maxArgs) {
        describe("arguments", function() {

          it("should be parsed", function() {
            setConfig({ baseUrl: 'http://qux.com' });
            execute('-l', 'debug', command, 'foo.scenario.js');
            expect(spy).toHaveBeenCalledWith(parsed({
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

      var output = capture(function() {
        program.buildCommand().outputHelp();
      });

      lines = _.filter(output.split("\n"), function(line) {
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

      expect(options.length).toBe(11);
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
    });

    it("should show information about custom parameters", function() {

      var customParamsIndex = _.indexOf(lines, '  Custom Parameters:'),
          customParams = cleanHelp(lines.slice(customParamsIndex + 1));

      expect(customParams.length).toBe(2);
      expect(customParams[0]).toBe('The -p, --params option can be used multiple times to give custom parameters to a scenario.');
      expect(customParams[1]).toBe('api-copilot -p param1 -p param2=value -p param3=value');
    });
  });

  function capture(fn) {

    var output = [];

    var write = process.stdout.write;
    process.stdout.write = function(string) {
      output.push(string ? string : '');
    };

    fn();

    process.stdout.write = write;

    return output.join("\n");
  }

  function cleanHelp(lines) {
    return _.map(lines, function(line) {
      return line.trim().replace(/ +/g, ' ');
    });
  }
});
