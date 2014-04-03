var q = require('q');

exports.runScenario = function(scenario, expectedResult, runOptions) {

  var result,
      deferred = q.defer();

  expectedResult = typeof(expectedResult) != 'undefined' ? expectedResult : true;

  runs(function() {
    scenario.run(runOptions).then(function(value) {
      deferred.resolve(value);
      result = true;
    }, function(err) {
      deferred.reject(err);
      result = false;
    });
  });

  waitsFor(function() {
    return result !== undefined;
  }, "The scenario should have finished running.", 50);

  runs(function() {
    expect(result).toBe(expectedResult);
  });

  return deferred.promise;
};

exports.addMatchers = function(jasmine) {
  jasmine.addMatchers({
    toBeAnError: function(expected) {

      var actual = this.actual,
          isNot = this.isNot,
          classMatches = actual instanceof Error,
          messageMatches = actual.message === expected;

      this.message = function() {

        var message = 'Expected an error with message "' + expected + '", got ';
        if (!classMatches) {
          message += typeof(actual);
        } else if (!messageMatches) {
          message += '"' + actual.message + '"';
        }

        return message;
      };

      return classMatches && messageMatches;
    }
  });
};
