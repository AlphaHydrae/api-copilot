var q = require('q');

exports.fulfill = function(value) {
  var deferred = q.defer();
  deferred.resolve(value);
  return deferred.promise;
};

exports.reject = function(err) {
  var deferred = q.defer();
  deferred.reject(err);
  return deferred.promise;
};

exports.runScenario = function(scenario, expectedResult) {

  var result,
      deferred = q.defer();

  expectedResult = typeof(expectedResult) != 'undefined' ? expectedResult : true;

  runs(function() {
    scenario.run().then(function(value) {
      deferred.resolve(value);
      result = true;
    }, function(err) {
      deferred.reject(err);
      result = false;
    });
  });

  waitsFor(function() {
    return typeof(result) != 'undefined';
  }, "The scenario should have finished running.", 50);

  runs(function() {
    expect(result).toBe(expectedResult);
  });

  return deferred.promise;
};
