var _ = require('underscore'),
    path = require('path'),
    yaml = require('js-yaml');

describe("CLI Command", function() {

  var fsMock = require('./support/fs.mock'),
      commandInjector = require('../lib/cli.command').inject,
      pkg = require('../package');

  var command, defaultOptions;
  beforeEach(function() {

    fsMock.reset();

    defaultOptions = {
      log: 'info',
      source: 'api'
    };

    Command = commandInjector({
      fs: fsMock
    });

    command = new Command();
  });

  function parse() {
    return command.parse([ 'node', 'bin', ].concat(Array.prototype.slice.call(arguments)));
  }

  function parsed(options) {
    return {
      options: _.extend({}, defaultOptions, options),
      args: Array.prototype.slice.call(arguments ,1)
    };
  }

  var cwd = process.cwd(),
      defaultConfigFile = path.resolve(cwd, 'api-copilot.yml');

  function setConfig(options, file) {
    fsMock.files[file ? path.resolve(cwd, file) : defaultConfigFile] = yaml.safeDump(options);
  }

  it("should produce the default options with no arguments", function() {
    expect(parse()).toEqual(parsed());
  });

  describe("command line", function() {

    it("should parse the log option", function() {
      expect(parse('-l', 'debug')).toEqual(parsed({ log: 'debug' }));
      expect(parse('--log', 'trace')).toEqual(parsed({ log: 'trace' }));
    });

    it("should not accept unknown log levels", function() {
      _.each([ 'foo', 'bar', 'baz', 'traze' ], function(unknownLogLevel) {
        expect(parse('-l', unknownLogLevel)).toEqual(parsed());
        expect(parse('--log', unknownLogLevel)).toEqual(parsed());
      });
    });

    it("should parse the source option", function() {
      expect(parse('-s', 'foo')).toEqual(parsed({ source: 'foo' }));
      expect(parse('--source', 'bar')).toEqual(parsed({ source: 'bar' }));
    });

    it("should parse the baseUrl option", function() {
      expect(parse('-u', 'http://foo.com')).toEqual(parsed({ baseUrl: 'http://foo.com' }));
      expect(parse('--base-url', 'http://bar.com')).toEqual(parsed({ baseUrl: 'http://bar.com' }));
    });

    it("should parse the showTime option", function() {
      expect(parse('-t')).toEqual(parsed({ showTime: true }));
      expect(parse('--show-time')).toEqual(parsed({ showTime: true }));
    });

    it("should parse the showRequest option", function() {
      expect(parse('-q')).toEqual(parsed({ showRequest: true }));
      expect(parse('--show-request')).toEqual(parsed({ showRequest: true }));
    });

    it("should parse the showResponseBody option", function() {
      expect(parse('-b')).toEqual(parsed({ showResponseBody: true }));
      expect(parse('--show-response-body')).toEqual(parsed({ showResponseBody: true }));
    });

    it("should parse the params option", function() {
      expect(parse('-p', 'foo')).toEqual(parsed({ params: { foo: true } }));
      expect(parse('--params', 'bar')).toEqual(parsed({ params: { bar: true } }));
    });

    it("should parse multiple params options", function() {
      expect(parse('-p', 'foo', '--params', 'bar', '-p', 'baz')).toEqual(parsed({ params: { foo: true, bar: true, baz: true } }));
    });

    it("should parse key/value params options", function() {
      expect(parse('-p', 'foo=bar')).toEqual(parsed({ params: { foo: 'bar' } }));
      expect(parse('--params', 'baz=qux')).toEqual(parsed({ params: { baz: 'qux' } }));
    });

    it("should parse mixed params options", function() {
      expect(parse('-p', 'foo=bar', '-p', 'baz', '--params', 'qux=corge')).toEqual(parsed({ params: { foo: 'bar', baz: true, qux: 'corge' } }));
    });

    it("should not parse the config option", function() {
      expect(parse('-c', 'foo.yml')).toEqual(parsed());
      expect(parse('--config', 'bar.yml')).toEqual(parsed());
    });

    it("should override configuration file options", function() {
      setConfig({ log: 'debug', source: 'foo', baseUrl: 'http://bar.com' });
      expect(parse('-l', 'trace', '--source', 'baz', '-u', 'http://qux.com')).toEqual(parsed({ log: 'trace', source: 'baz', baseUrl: 'http://qux.com' }));
    });

    it("should merge configuration file params", function() {
      setConfig({ params: { foo: 'bar', baz: 'qux' } });
      expect(parse('-p', 'baz=corge', '--params', 'grault')).toEqual(parsed({ params: { foo: 'bar', baz: 'corge', grault: true } }));
    });
  });

  describe("configuration file", function() {

    it("should parse the log option", function() {
      setConfig({ log: 'debug' });
      expect(parse()).toEqual(parsed({ log: 'debug' }));
    });

    it("should not accept unknown log levels", function() {
      _.each([ 'foo', 'bar', 'baz', 'traze' ], function(unknownLogLevel) {
        setConfig({ log: unknownLogLevel });
        expect(parse()).toEqual(parsed());
      });
    });

    it("should parse the source option", function() {
      setConfig({ source: 'foo' });
      expect(parse()).toEqual(parsed({ source: 'foo' }));
    });

    it("should parse the baseUrl option", function() {
      setConfig({ baseUrl: 'http://foo.com' });
      expect(parse()).toEqual(parsed({ baseUrl: 'http://foo.com' }));
    });

    it("should parse the showTime option", function() {
      setConfig({ showTime: true });
      expect(parse()).toEqual(parsed({ showTime: true }));
    });

    it("should parse the showRequest option", function() {
      setConfig({ showRequest: true });
      expect(parse()).toEqual(parsed({ showRequest: true }));
    });

    it("should parse the showResponseBody option", function() {
      setConfig({ showResponseBody: true });
      expect(parse()).toEqual(parsed({ showResponseBody: true }));
    });

    it("should parse the params option", function() {
      setConfig({ params: { foo: 'bar' } });
      expect(parse()).toEqual(parsed({ params: { foo: 'bar' } }));
    });

    it("should not parse the config option", function() {
      setConfig({ config: 'foo' });
      expect(parse()).toEqual(parsed());
    });

    it("should load the configuration from the file given in the config option", function() {
      setConfig({ log: 'debug' });
      setConfig({ log: 'trace' }, 'foo.yml');
      expect(parse('-c', 'foo.yml')).toEqual(parsed({ log: 'trace' }));
      expect(parse('--config', 'foo.yml')).toEqual(parsed({ log: 'trace' }));
    });

    it("should not parse unknown options", function() {
      setConfig({ foo: 'bar', baz: 'qux' });
      expect(parse()).toEqual(parsed());
    });
  });

  describe("arguments", function() {

    it("should be parsed", function() {
      setConfig({ baseUrl: 'http://qux.com' });
      expect(parse('-l', 'debug', 'foo.scenario.js', 'bar.scenario.js', 'baz.scenario.js')).toEqual(parsed({
        log: 'debug',
        baseUrl: 'http://qux.com'
      }, 'foo.scenario.js', 'bar.scenario.js', 'baz.scenario.js'));
    });
  });

  describe("commander definition", function() {

    var CommanderMock = require('./support/commander.mock');

    var Command, commanderCommand, argv;
    beforeEach(function() {

      CommanderMock.reset();

      Command = commandInjector({
        commander: CommanderMock,
        fs: fsMock
      });

      var command = new Command();

      argv = [ '--foo', '--bar', '--baz' ];
      command.parse(argv);

      expect(CommanderMock.commandInstances.length).toBe(1);
      commanderCommand = CommanderMock.commandInstances[0];
    });

    it("should set the version", function() {
      expect(commanderCommand.version.calls.length).toBe(1);
      expect(commanderCommand.version).toHaveBeenCalledWith(pkg.version);
    });

    it("should define the log option", function() {
      expect(commanderCommand.option).toHaveBeenCalledWith('-l, --log [level]', 'Log level (trace, debug, info; info by default)');
    });

    it("should define the source option", function() {
      expect(commanderCommand.option).toHaveBeenCalledWith('-s, --source [dir]', 'Directory where API scenarios are located ("api" by default)');
    });

    it("should define the baseUrl option", function() {
      expect(commanderCommand.option).toHaveBeenCalledWith('-u, --base-url [url]', 'Override the base URL of the scenario');
    });

    it("should define the config option", function() {
      expect(commanderCommand.option).toHaveBeenCalledWith('-c, --config [file]', 'Set the configuration file path');
    });

    it("should define the showTime option", function() {
      expect(commanderCommand.option).toHaveBeenCalledWith('-t, --show-time', 'Print the date and time with each log');
    });

    it("should define the showRequest option", function() {
      expect(commanderCommand.option).toHaveBeenCalledWith('-q, --show-request', 'Print options for each HTTP request (only with debug or trace log level)');
    });

    it("should define the showResponseBody option", function() {
      expect(commanderCommand.option).toHaveBeenCalledWith('-b, --show-response-body', 'Print response body for each HTTP request (only with debug or trace log level)');
    });

    it("should define the showFullUrl option", function() {
      expect(commanderCommand.option).toHaveBeenCalledWith('--show-full-url', 'Show full URLs even when a base URL is configured (only with debug or trace log level)');
    });

    it("should define the params option", function() {

      var calls = _.filter(commanderCommand.option.calls, function(call) {
        return call.args[0] == '-p, --params [name]';
      });

      expect(calls.length).toEqual(1);

      var args = calls[0].args;
      expect(args[1]).toBe('Add a custom parameter (see Custom Parameters)');
      expect(typeof(args[2])).toBe('function');
      expect(args[3]).toEqual({});
    });

    it("should not set other options", function() {
      expect(commanderCommand.option.calls.length).toBe(9);
    });

    it("should parse the arguments", function() {
      expect(commanderCommand.parse.calls.length).toBe(1);
      expect(commanderCommand.parse).toHaveBeenCalledWith(argv);
    });
  });
});
