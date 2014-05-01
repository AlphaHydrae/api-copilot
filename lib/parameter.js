var _ = require('underscore'),
    events = require('events'),
    merge = require('deepmerge'),
    q = require('q'),
    util = require('util');

module.exports = function(deps) {

  deps = deps || {};
  var readline = deps.readline || require('readline');

  function Parameter(name, options) {

    this.name = name;
    events.EventEmitter.call(this);

    options = options || {};
    this.flag = !!options.flag;
    this.required = _.has(options, 'required') ? !!options.required : !this.flag;
    this.pattern = options.pattern;
    this.description = options.description;
    this.valueDescription = options.valueDescription;
  }

  util.inherits(Parameter, events.EventEmitter);

  _.extend(Parameter.prototype, {

    prompt: function() {

      console.log();
      console.log(this.describe());
      this.emit('describe', function(text) {
        console.log(_.isString(text) ? text.replace(/^/gm, '  ') : text);
      });

      return q.fcall(_.bind(this.promptForValue, this)).then(_.bind(this.checkPromptAnswer, this));
    },

    promptForValue: function() {

      console.log();

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
      this.validate(answer, errors, true);

      if (errors.length) {
        console.log();
        console.log(('The value "' + answer + '" is invalid:').yellow);
        _.each(errors, function(error) {
          console.log('- ' + error);
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

    validate: function(value, errors, prompt) {

      var n = errors.length;

      var error = null,
          usage = false;

      if (this.required && (value === undefined || !value.trim().length)) {
        error = this.name.bold + ' is required';
        usage = true;
      } else if (this.flag && value !== undefined && value !== true && value !== false) {
        error = this.name.bold + ' is a boolean flag; it cannot have value "' + value + '"';
        usage = true;
      } else if (!this.flag && value === true) {
        error = this.name.bold + ' requires a value; ';
        usage = true;
      } else if (!this.flag && value !== undefined && !this.matchesPattern(value)) {
        error = this.name.bold + ' cannot accept value "' + value + '" because it does not match pattern ' + this.pattern;
      }

      if (error) {
        if (usage && !prompt) {
          error = error + '; ' + this.usageNotice();
        }
        errors.push(error);
      }

      return errors.length == n;
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
        description += this.description.replace(/^/gm, '\n  ');
      }

      return description;
    },

    matchesPattern: function(value) {
      if (!this.pattern) {
        return true;
      } else if (!_.isString(value)) {
        return false;
      } else if (_.isRegExp(this.pattern)) {
        return this.pattern.test(value);
      } else if (_.isString(this.pattern)) {
        return value.indexOf(this.pattern) >= 0;
      } else {
        throw new Error('Parameter "' + this.name + '" was given a pattern of type ' + typeof(options.pattern) + '; only strings and regular expressions are supported.');
      }
    },

    usageNotice: function(options) {
      if (this.flag) {
        return "activate it with `-p " + this.name + "` or `--param " + this.name + "`";
      } else {
        return "set it with `-p " + this.name + "=value` or `--param " + this.name + "=value`";
      }
    }
  });

  return Parameter;
};
