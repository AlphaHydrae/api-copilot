var _ = require('underscore'),
    h = require('./support/helpers'),
    slice = Array.prototype.slice;

describe("Parameters", function() {

  var parameterFactory = require('../lib/parameter');

  var Parameter, mocks, readlineAnswers, lines;
  beforeEach(function() {

    lines = [];
    readlineAnswers = [];

    mocks = {
      print: function(text) {
        lines = lines.concat((text || '').split("\n"));
      },
      readlineInterface: {
        question: function(query, callback) {
          if (!readlineAnswers.length) {
            throw new Error('No readline answer mocked');
          }

          callback(readlineAnswers.shift());
        },
        close: function() {}
      },
      readline: {
        createInterface: function() {
          return mocks.readlineInterface;
        }
      }
    };

    spyOn(mocks.readlineInterface, 'question').andCallThrough();
    spyOn(mocks.readlineInterface, 'close');
    spyOn(mocks.readline, 'createInterface').andCallThrough();

    Parameter = parameterFactory(mocks.readline, mocks.print);
  });

  function addReadlineAnswer(answer) {
    readlineAnswers.push(answer);
  }

  it("should not accept a non-string name", function() {
    _.each([ undefined, null, true, false, 2.4, [], {} ], function(invalidName) {
      expect(function() {
        new Parameter(invalidName, {});
      }).toThrow('Parameter name must be a string; got ' + JSON.stringify(invalidName) + ' (' + typeof(invalidName) + ')');
    });
  });

  it("should not accept a non-function processor", function() {
    _.each([ undefined, null, true, false, 2.4, [], {} ], function(invalidProcessor) {
      expect(function() {
        new Parameter('foo', { processor: invalidProcessor });
      }).toThrow('Parameter `processor` option must be a function; got ' + JSON.stringify(invalidProcessor) + ' (' + typeof(invalidProcessor) + ')');
    });
  });

  describe("#displayValue", function() {

    function displayValue(name, options, value) {
      return new Parameter(name, options).displayValue(value);
    }

    it("should return the value", function() {
      expect(displayValue('foo', {}, 'bar')).toBe('bar');
    });

    it("should obfuscate the value if the parameter name indicates a secret", function() {
      _.each([ 'secret', 'apiSecret', 'password', 'userPassword', 'authToken' ], function(secret) {
        expect(displayValue(secret, {}, 'bar')).toBe('***');
      });
    });

    it("should obfuscate the value if the obfuscate option is set", function() {
      expect(displayValue('foo', { obfuscate: true }, 'bar')).toBe('***');
    });
  });

  describe("#processValues", function() {

    function passthroughProcessor() {

      var mocks = {
        processor: function(value) {
          return value;
        }
      };

      spyOn(mocks, 'processor').andCallThrough();

      return mocks.processor;
    }

    function customProcessor() {

      var returnValues = slice.call(arguments),
          mocks = {
            processor: function() {
              return returnValues.shift();
            }
          };

      spyOn(mocks, 'processor').andCallThrough();

      return mocks.processor;
    }

    function processValues(values, options) {
      return new Parameter('foo', options).processValues(values);
    }

    it("should return the value by default", function() {
      expect(processValues('value')).toBe('value');
    });

    it("should return the default value if set and no value is given", function() {
      expect(processValues([], { default: 'yeehaw' })).toBe('yeehaw');
    });

    it("should override the default value", function() {
      expect(processValues('value', { default: 'yeehaw' })).toBe('value');
    });

    it("should return the last of multiple values", function() {
      expect(processValues([ 'value1', 'value2', 'value3' ])).toBe('value3');
    });

    it("should pass a single value to the processor function", function() {
      var processor = passthroughProcessor();
      expect(processValues('value', { processor: processor })).toBe('value');
      expect(processor).toHaveBeenCalledWith('value', undefined);
      expect(processor.calls.length).toBe(1);
    });

    it("should pass the default value to the processor function", function() {
      var processor = passthroughProcessor();
      expect(processValues('value', { processor: processor, default: 'yeehaw' })).toBe('value');
      expect(processor).toHaveBeenCalledWith('value', 'yeehaw');
      expect(processor.calls.length).toBe(1);
    });

    it("should pass multiple values to the processor function", function() {
      var processor = passthroughProcessor();
      expect(processValues([ 'value1', 'value2', 'value3' ], { processor: processor, default: 'yeehaw' })).toBe('value3');
      expect(processor).toHaveBeenCalledWith('value1', 'yeehaw');
      expect(processor).toHaveBeenCalledWith('value2', 'value1');
      expect(processor).toHaveBeenCalledWith('value3', 'value2');
      expect(processor.calls.length).toBe(3);
    });

    it("should use the value returned by the processor function", function() {
      var processor = customProcessor('foo');
      expect(processValues('value', { processor: processor, default: 'yeehaw' })).toBe('foo');
      expect(processor).toHaveBeenCalledWith('value', 'yeehaw');
      expect(processor.calls.length).toBe(1);
    });

    it("should use the values returned by the processor function", function() {
      var processor = customProcessor('foo', 'bar', 'baz');
      expect(processValues([ 'value1', 'value2', 'value3' ], { processor: processor, default: 'yeehaw' })).toBe('baz');
      expect(processor).toHaveBeenCalledWith('value1', 'yeehaw');
      expect(processor).toHaveBeenCalledWith('value2', 'foo');
      expect(processor).toHaveBeenCalledWith('value3', 'bar');
      expect(processor.calls.length).toBe(3);
    });
  });

  describe("#describe", function() {

    function description(name, options) {
      return new Parameter(name, options).describe();
    }

    it("should describe a required parameter", function() {
      expect(description('foo')).toBe('foo=value'.underline + requiredNotice());
    });

    it("should describe an optional parameter", function() {
      expect(description('bar', { required: false })).toBe('bar=value'.underline);
    });

    it("should describe a flag parameter", function() {
      expect(description('flag', { flag: true })).toBe('flag'.underline);
    });

    it("should describe a required flag parameter (same as not required)", function() {
      expect(description('flag', { flag: true, required: true })).toBe('flag'.underline);
    });

    it("should describe a parameter constrained by a pattern", function() {
      expect(description('pattern', { pattern: /^http:/ })).toBe('pattern=/^http:/'.underline + requiredNotice());
    });

    it("should describe a parameter constrained by a string pattern", function() {
      expect(description('stringPattern', { pattern: 'abc' })).toBe('stringPattern=abc'.underline + requiredNotice());
    });

    it("should include an additional description", function() {
      expect(description('doc', { description: 'umented' })).toBe('doc=value'.underline + requiredNotice() + '\n  umented');
    });

    it("should indent the full description", function() {
      expect(description('verbose', { flag: true, description: 'many\nmany\n  lines' })).toBe('verbose'.underline + '\n  many\n  many\n    lines');
    });
  });

  describe("#validate", function() {

    function validate(name, options, value) {

      var result = {
        errors: [],
        errorsForPrompt: []
      };

      var param = new Parameter(name, options);
      result.result = param.validate(value, result.errors);
      result.resultForPrompt = param.validate(value, result.errorsForPrompt, true);

      return result;
    }

    it("should accept a value for required parameters", function() {
      expectNoErrors(validate('required', {}, 'value'));
    });

    it("should not accept boolean values for required non-flag parameters", function() {
      // false and undefined are already handled by the required check
      expectErrors(validate('nonFlag', {}, true),
        [ 'nonFlag'.bold + ' requires a value' + usageNotice('nonFlag') ],
        [ 'nonFlag'.bold + ' requires a value' ]);
    });

    it("should not accept boolean values for optional non-flag parameters", function() {
      _.each([ false, true ], function(bool) {
        expectErrors(validate('nonFlag', { required: false }, bool),
          [ 'nonFlag'.bold + ' requires a value' + usageNotice('nonFlag') ],
          [ 'nonFlag'.bold + ' requires a value' ]);
      });
    });

    it("should not accept falsy values for a required parameter", function() {
      _.each([ undefined, false, 0 ], function(falsy) {
        expectErrors(validate('foo', {}, falsy),
          [ 'foo'.bold + ' is required' + usageNotice('foo') ],
          [ 'foo'.bold + ' is required' ]);
      });
    });

    it("should not accept empty or blank strings for a required parameter", function() {
      _.each([ '', '   ', '\t \t  ' ], function(blank) {
        expectErrors(validate('bar', {}, blank),
          [ 'bar'.bold + ' is required' + usageNotice('bar') ],
          [ 'bar'.bold + ' is required' ]);
      });
    });

    it("should accept true or false for a flag parameter", function() {
      _.each([ false, true ], function(bool) {
        expectNoErrors(validate('flag', { flag: true }, bool));
      });
    });

    it("should accept true or false for a required flag parameter", function() {
      _.each([ false, true ], function(bool) {
        expectNoErrors(validate('flag', { flag: true, required: true }, bool));
      });
    });

    it("should not accept undefined for a flag parameter", function() {
      expectErrors(validate('flag', { flag: true }, undefined),
        [ 'flag'.bold + ' is a boolean flag; it cannot have value "undefined"' + usageNotice('flag', true) ],
        [ 'flag'.bold + ' is a boolean flag; it cannot have value "undefined"' ]);
    });

    it("should not accept a string value for a flag parameter", function() {
      _.each([ '', 'value', '   ' ], function(string) {
        expectErrors(validate('flag', { flag: true }, string),
          [ 'flag'.bold + ' is a boolean flag; it cannot have value "' + string + '"' + usageNotice('flag', true) ],
          [ 'flag'.bold + ' is a boolean flag; it cannot have value "' + string + '"' ]);
      });
    });

    it("should accept strings matching the configured pattern", function() {
      _.each([ 'http://example.com', 'https://secure.example.com' ], function(url) {
        expectNoErrors(validate('pattern', { pattern: /^https?:/ }, url));
      });
    });

    it("should accept undefined with a pattern if not required", function() {
      expectNoErrors(validate('pattern', { required: false, pattern: /^https?:/ }, undefined));
    });

    it("should not accept strings not matching the configured pattern", function() {
      _.each([ '', 'foo', 'htttp//borked.url' ], function(invalid) {
        expectErrors(validate('pattern', { required: false, pattern: /^https?:/ }, invalid),
          [ 'pattern'.bold + ' cannot accept value "' + invalid + '" because it does not match pattern /^https?:/' ]);
      });
    });
  });

  describe("#prompt", function() {

    var param;
    function prompt() {

      var fulfilledSpy = jasmine.createSpy();
      param.prompt().then(fulfilledSpy);

      return fulfilledSpy;
    }

    function setDescription(desc) {
      spyOn(param, 'describe').andReturn(desc);
    }

    function setValidationError(message) {
      spyOn(param, 'validate').andCallFake(function(value, errors) {
        if (message === false) {
          return true;
        } else {
          errors.push(message);
          return false;
        }
      });
    }

    it("should print the parameter description and prompt for a new value", function() {

      param = new Parameter('foo');
      setDescription('foo=value');
      addReadlineAnswer('bar');

      var fulfilledSpy = prompt();
      h.waitForSpies(fulfilledSpy);

      runs(function() {

        expect(lines).toEqual([ '', 'foo=value', '' ]);

        expectReadlineCalled();
        expectReadlineQuestion('Enter a value for foo: ');

        expect(fulfilledSpy).toHaveBeenCalledWith('bar');
      });
    });

    it("should print a flag parameter description and prompt for a new value", function() {

      param = new Parameter('flag', { flag: true });
      setDescription('flag');
      addReadlineAnswer('yes');

      var fulfilledSpy = prompt();
      h.waitForSpies(fulfilledSpy);

      runs(function() {

        expect(lines).toEqual([ '', 'flag', '' ]);

        expectReadlineCalled();
        expectReadlineQuestion('Enter a value for flag (yes/no): ');

        expect(fulfilledSpy).toHaveBeenCalledWith(true);
      });
    });

    it("should print a flag parameter description and prompt for a new value and accept false", function() {

      param = new Parameter('flag', { flag: true });
      setDescription('flag');
      addReadlineAnswer('no');

      var fulfilledSpy = prompt();
      h.waitForSpies(fulfilledSpy);

      runs(function() {

        expect(lines).toEqual([ '', 'flag', '' ]);

        expectReadlineCalled();
        expectReadlineQuestion('Enter a value for flag (yes/no): ');

        expect(fulfilledSpy).toHaveBeenCalledWith(false);
      });
    });

    it("should print the parameter description and emit the describe event", function() {

      param = new Parameter('foo');
      setDescription('foo=value');
      addReadlineAnswer('bar');

      param.on('describe', function(print) {
        print('more\ndetailed\ndescription');
      });

      var fulfilledSpy = prompt();
      h.waitForSpies(fulfilledSpy);

      runs(function() {

        expect(lines).toEqual([ '', 'foo=value', '  more', '  detailed', '  description', '' ]);

        expectReadlineCalled();
        expectReadlineQuestion('Enter a value for foo: ');

        expect(fulfilledSpy).toHaveBeenCalledWith('bar');
      });
    });

    it("should prompt for a new value until a valid one is given", function() {
      // TODO: refactor this to ask one question at a time

      param = new Parameter('fix');
      setDescription('fix=value');

      addReadlineAnswer('666');
      setValidationError('value is wrong');

      addReadlineAnswer('good');

      var fulfilledSpy = prompt();
      h.waitForSpies(fulfilledSpy);

      runs(function() {

        expect(lines).toEqual([
          '', 'fix=value', '',
          '', 'The value "666" is invalid:'.yellow, '- value is wrong', ''
        ]);

        expectReadlineCalled(2);
        expectReadlineQuestion('Enter a value for fix: ');
        expectReadlineQuestion('Enter a value for fix: ');

        expect(fulfilledSpy).toHaveBeenCalledWith('good');
      });
    });
  });

  function expectReadlineCalled(n) {
    n = n || 1;

    _.times(n, function() {
      expect(mocks.readline.createInterface).toHaveBeenCalledWith({
        input: process.stdin,
        output: process.stdout
      });
    });

    expect(mocks.readline.createInterface.calls.length).toBe(n);
  }

  function expectReadlineQuestion(question) {

    var rl = mocks.readlineInterface;
    expect(rl.question).toHaveBeenCalledWith(question, jasmine.any(Function));

    expect(rl.close).toHaveBeenCalled();
  }

  function expectErrors(result, errors, errorsForPrompt) {
    expect(result).toEqual({
      result: false,
      errors: errors,
      resultForPrompt: false,
      errorsForPrompt: errorsForPrompt || errors
    });
  }

  function expectNoErrors(result) {
    expect(result).toEqual({
      result: true,
      errors: [],
      resultForPrompt: true,
      errorsForPrompt: []
    });
  }

  function usageNotice(name, flag) {
    if (flag) {
      return "; activate it with `-p " + name + "` or `--param " + name + "`";
    } else {
      return "; set it with `-p " + name + "=value` or `--param " + name + "=value`";
    }
  }

  function requiredNotice() {
    return ' ' + '(required)'.yellow;
  }
});
