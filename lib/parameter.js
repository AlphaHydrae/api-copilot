var _ = require('underscore'),
    events = require('events'),
    merge = require('deepmerge'),
    q = require('q'),
    util = require('util'),
    utils = require('./utils');

var SECRETS_REGEXP = /(password|secret|authtoken)/i;

module.exports = function(readline, print) {

  function defaultProcessor(value, defaultValue) {
    return value !== undefined ? value : defaultValue;
  }

  function Parameter(name, options) {

    options = options || {};
    if (!_.isString(name)) {
      throw utils.typeError('Parameter name must be a string', name);
    } else if (_.has(options, 'processor') && typeof(options.processor) != 'function') {
      throw utils.typeError('Parameter `processor` option must be a function', options.processor);
    }

    this.name = name;
    events.EventEmitter.call(this);

    this.flag = !!options.flag;
    this.required = this.flag ? false : !_.has(options, 'required') || !!options.required;
    this.pattern = options.pattern;

    this.description = options.description;
    this.valueDescription = options.valueDescription;
    this.obfuscate = !this.flag && (this.name.match(SECRETS_REGEXP) || !!options.obfuscate);

    this.defaultValue = this.flag ? !!options.default : options.default;
    this.processor = options.processor || defaultProcessor;
  }

  util.inherits(Parameter, events.EventEmitter);

  _.extend(Parameter.prototype, {

    displayValue: function(value) {
      if (!value) {
        return value;
      }

      return this.obfuscate ? value.toString().replace(/./g, '*') : value;
    },

    processValues: function(values) {
      values = _.isArray(values) ? values : [ values ];
      return _.reduce(values, this.processValue, this.defaultValue, this);
    },

    processValue: function(previousValue, value) {
      return this.processor(value, previousValue);
    },

    describe: function() {

      var description = this.name;
      if (!this.flag) {
        description += '=';
        if (this.valueDescription) {
          description += this.valueDescription;
        } else {
          description += (this.pattern ? this.pattern.toString() : 'value');
        }
      }

      description = description.underline;

      if (this.required) {
        description += ' ' + '(required)'.yellow;
      }

      if (this.description) {
        description += '\n' + this.description.replace(/^/gm, '  ');
      }

      return description;
    },

    validate: function(value, errors) {

      var n = errors.length;

      var error;

      if (this.required && (!value || (_.isString(value) && !value.trim().length))) {
        error = this.name.bold + ' is required';
      } else if (this.flag && value !== true && value !== false) {
        error = this.name.bold + ' is a boolean flag; it cannot have value "' + value + '"';
      } else if (!this.flag && (value === false || value === true)) {
        error = this.name.bold + ' requires a value';
      } else if (!this.flag && value !== undefined && !this.matchesPattern(value)) {
        error = this.name.bold + ' cannot accept value "' + value + '" because it does not match pattern ' + this.pattern;
      }

      if (error) {
        errors.push(error);
      }

      return errors.length == n;
    },

    prompt: function() {

      print();
      print(this.describe());
      this.emit('describe', function(text) {
        print(_.isString(text) ? text.replace(/^/gm, '  ') : text);
      });

      return q.fcall(_.bind(this.promptForValue, this)).then(_.bind(this.checkPromptAnswer, this));
    },

    promptForValue: function() {

      print();

      var deferred = q.defer();

      var message = 'Enter a value for ' + this.name;
      if (this.flag) {
        message += ' (yes/no)';
      }

      var rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });

      rl.question(message + ': ', function(answer) {
        rl.close();
        deferred.resolve(answer);
      });

      return deferred.promise;
    },

    checkPromptAnswer: function(answer) {

      answer = this.coercePromptAnswer(answer);

      var errors = [];
      this.validate(answer, errors);

      if (errors.length) {
        print();
        print(('The value "' + answer + '" is invalid:').yellow);
        _.each(errors, function(error) {
          print('- ' + error);
        });

        return this.promptForValue();
      }

      return answer;
    },

    coercePromptAnswer: function(answer) {
      if (!this.flag || !_.isString(answer)) {
        return answer;
      } else if (answer.match(/^(?:1|y|yes|t|true)$/)) {
        return true;
      } else if (answer.match(/^(?:0|n|no|f|false)$/)) {
        return false;
      } else {
        return answer;
      }
    },

    matchesPattern: function(value) {
      if (!this.pattern) {
        return true;
      } else if (!_.isString(value)) {
        return false;
      } else if (_.isRegExp(this.pattern)) {
        return this.pattern.test(value);
      } else if (_.isString(this.pattern)) {
        // TODO: spec this
        return value.indexOf(this.pattern) >= 0;
      } else {
        throw new Error('Parameter "' + this.name + '" was given a pattern of type ' + typeof(options.pattern) + '; only strings and regular expressions are supported.');
      }
    }
  });

  return Parameter;
};

module.exports['@singleton'] = true;
module.exports['@require'] = [ 'readline', 'cli.print' ];
