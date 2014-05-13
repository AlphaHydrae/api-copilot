var _ = require('underscore'),
    cp = require('child_process'),
    q = require('q'),
    path = require('path'),
    slice = Array.prototype.slice;

exports.startMockServer = function() {

  var started,
      server = new MockServer();

  runs(function() {
    server.start(function(err, port) {
      if (err) {
        console.warn(err);
      } else {
        started = true;
      }
    });
  });

  waitsFor(function() {
    return started;
  }, "the mock server to have started", 1000);

  return server;
};

exports.runScenario = function(scenario, expectedResult, options) {

  var result,
      deferred = q.defer();

  options = options || {};
  expectedResult = typeof(expectedResult) != 'undefined' ? expectedResult : true;

  runs(function() {
    scenario.run(options.runOptions).then(function(value) {
      deferred.resolve(value);
      result = true;
    }, function(err) {
      deferred.reject(err);
      result = false;
    });
  });

  waitsFor(function() {
    return result !== undefined;
  }, "the scenario to finished running", options.timeout || 50);

  runs(function() {
    expect(result).toBe(expectedResult);
  });

  return deferred.promise;
};

exports.runPromise = function(promise, expectedResult) {

  if (expectedResult === undefined) {
    expectedResult = true;
  }

  var spy = jasmine.createSpy(),
      unexpectedSpy = jasmine.createSpy();

  promise[expectedResult ? 'then' : 'fail'](spy);
  promise[expectedResult ? 'fail' : 'then'](unexpectedSpy);

  var warning;
  waitsFor(function() {
    if (!warning && unexpectedSpy.calls.length) {
      var result = unexpectedSpy.calls[0].args[0];
      console.log('Promise was unexpectedly ' + (expectedResult ? 'rejected' : 'resolved') + ' with ' + (result instanceof Error ? result.stack : result));
      warning = true;
    }

    return spy.calls.length;
  }, 'the promise to be ' + (expectedResult ? 'resolved' : 'rejected'), 50);

  return spy;
};

exports.waitForSpies = function() {

  var spies = slice.call(arguments);
  waitsFor(function() {
    return !!_.find(spies, function(spy) {
      return spy.calls.length;
    });
  }, "the spy/spies to have been called", 50);
};

exports.addMatchers = function(jasmine) {
  jasmine.addMatchers({

    toBeNaN: function() {

      var actual = this.actual,
          actualIsNaN = isNaN(actual);

      this.message = function() {
        return 'Expected NaN, got ' + actual + ' (' + typeof(actual) + ')';
      };

      return actualIsNaN;
    },

    toBeAnError: function(expected) {

      var actual = this.actual,
          isNot = this.isNot,
          classMatches = actual instanceof Error,
          messageMatches = actual && actual.message === expected;

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

exports.capture = function (fn) {

  var output = {
    stdout: [],
    stderr: []
  }, original = {
    stdout: process.stdout.write,
    stderr: process.stderr.write
  };

  function eachStream(fn) {
    _.each([ 'stdout', 'stderr' ], fn);
  }

  eachStream(function(stream) {
    process[stream].write = function(string) {
      output[stream].push(string ? string : '');
    };
  });

  try {
    fn();
  } catch (e) {
    eachStream(function(stream) {
      process[stream].write = original[stream];
      process[stream].write(output[stream].join("\n"));
    });
    throw e;
  }

  eachStream(function(stream) {
    process[stream].write = original[stream];
    output[stream] = output[stream].join("\n");
  });

  return output;
};

function MockServer() {
}

_.extend(MockServer.prototype, {

  start: function(callback) {
    this.process = cp.fork(path.join(__dirname, 'server.mock.js'), [], { silent: true });
    this.process.on('message', _.bind(this.onStart, this, callback));
  },

  onStart: function(callback, data) {
    if (data.error) {
      return callback(data.error);
    }

    this.port = data.port;
    callback(undefined, data.port);
  },

  url: function(path) {
    return 'http://127.0.0.1:' + this.port + path;
  },

  stop: function() {
    if (this.process) {
      this.process.kill();
    }
  }
});
