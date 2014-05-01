// # Scenario
// A scenario is a series of steps that can make HTTP calls and process data.
// This class contains mostly the flow control code that executes steps.
// It also handles emitting events that are used by other components, e.g. for logging.
//
// **Related components:**
//
// * [client.js](client.js.html) - HTTP client;
// * [scenario.client.js](scenario.client.js.html) - scenario methods to make HTTP calls;
// * [cli.logger.js](cli.logger.js.html) - command line logger based on events emitted by a scenario.

// ## Events
// A scenario is an [event emitter](http://nodejs.org/api/events.html).
// The following events can be emitted:
//
// * `configure` - before running;
// * `scenario:start` - when the scenario starts running;
// * `scenario:error` - if a step fails and the scenario is interrupted;
// * `scenario:end` - when the scenario has finished running;
// * `step:start` - when a step starts executing;
// * `step:error` - if a step fails;
// * `step:skip` - if a step is skipped;
// * `step:done` - when a step is done executing;
// * `client:request` - when an HTTP request is started;
// * `client:error` - if an HTTP request fails;
// * `client:response` - when an HTTP response is received.
//
// See [Run Algorithm](#run%20algorithm) and [client.js](client.js.html) for more information on these events.

// ## Dependencies
// The following external libraries are used:
//
// * [deepmerge](https://github.com/nrf110/deepmerge) for object merging;
// * [q](https://github.com/kriskowal/q) for promises;
// * [log4js](https://github.com/nomiddlename/log4js-node) for logging;
// * [underscore](http://underscorejs.org) for functional utilities.
var _ = require('underscore'),
    events = require('events'),
    merge = require('deepmerge'),
    q = require('q'),
    slice = Array.prototype.slice,
    util = require('util');

// ## Exports
// This module exports a function that can be used to inject mock dependencies.
// Call the function with no arguments to get the Scenario class with its real dependencies:
//
//     var scenarioInjector = require('./scenario');
//     var Scenario = scenarioInjector();
//
// To inject mock dependencies, pass an object with mocks:
//
//     var Scenario = scenarioInjector({
//       log4js: log4jsMock,
//       Client: ClientMock
//     });
//
// The following dependencies can be mocked:
//
// * `log4js` - the logging framework;
// * `Client` - the HTTP client class.
module.exports = function(deps) {

  deps = deps || {};
  var log4js = deps.log4js || require('log4js'),
      Client = deps.Client || require('./client')(),
      parameterFactory = deps.parameterFactory || require('./factory')(require('./parameter')());

  // Functionality related to HTTP calls is contained in [scenario.client.js](scenario.client.js.html).
  var ScenarioClientExtensions = require('./scenario.client'),
      ScenarioParameterExtensions = require('./scenario.parameters');

  // <a name="constructor"></a>
  // ## Constructor
  // Constructs a new scenario with no steps.
  //
  // **Options:**
  //
  // * `name` **required** - the name of the scenario;
  // * `log` - log level (trace, debug or info);
  // * `baseUrl` - the base URL to use for HTTP calls;
  // * `showTime` - print the date and time with each log;
  // * `showRequest` - print options for each HTTP request (only with debug or trace log levels);
  // * `showResponseBody` - print response body for each HTTP request (only with debug or trace log levels);
  // * `showFullUrl` - always print full URLs even when a base URL is configured (only with debug or trace log levels).
  function Scenario(options) {
    if (!_.isObject(options)) {
      throw new Error('Options must be an object');
    } else if (!_.isString(options.name)) {
      throw new Error('"name" must be a string, got ' + options.name);
    }

    this.name = options.name;
    this.logger = log4js.getLogger(this.name);

    this.baseOptions = _.extend({}, options);

    this.parameters = [];
    this.parameterValues = this.baseOptions.params || {};

    this.steps = [];

    this.client = new Client();
    this.requestFilters = [];

    // Most of these options are not handled by the scenario object itself.
    // The `configure` event is emitted with all the options when the scenario is
    // run (see the `#run` method). Other components listen to that event to
    // update their configuration.
    //
    // The scenario itself listens to that event, and also forwards it to
    // the HTTP client.
    events.EventEmitter.call(this);
    this.on('configure', _.bind(this.onConfigure, this));
    this.on('configure', _.bind(this.client.emit, this.client, 'configure'));

    // ### Client Events
    // All events emitted by the scenario's HTTP client are also emitted
    // by the scenario object itself, with the `client:` prefix:
    //
    // * `client:request` - emitted when an HTTP request starts;
    // * `client:error` - emitted when an HTTP request fails;
    // * `client:response` - emitted when an HTTP response is received.
    _.each([ 'request', 'error', 'response' ], function(event) {
      this.client.on(event, _.bind(this.emit, this, 'client:' + event));
    }, this);
  }

  // A scenario is an [event emitter](http://nodejs.org/api/events.html).
  util.inherits(Scenario, events.EventEmitter);

  _.extend(Scenario.prototype, {

    // ## Flow Control Methods

    // <a name="method-step"></a>
    // ### #step(name, definition)
    // Adds a named step to this scenario.
    //
    // The **name** is mandatory and must be unique as it can be used for flow control (see `#setNextStep`).
    //
    // The **definition** must be a function. The value it returns will be the first
    // argument of the next step.
    //
    //     scenario.step('a step', function() {
    //       return computeSomething();
    //     });
    //
    //     scenario.step('another step', function(computedData) {
    //       console.log(computedData);
    //     });
    //
    // A step can also return a promise. In that case, its future value will be the first
    // argument of the next step when the promise is resolved. For example, the HTTP client
    // returns a promise.
    //
    //     scenario.step('a step with an HTTP call', function() {
    //       return this.get({ url: 'http://example.com' });
    //     });
    //
    //     scenario.step('check the response', function(response) {
    //       console.log(response.statusCode);
    //     });
    //
    // If the promise is rejected, the step fails and the scenario is interrupted.
    step: function(name, definition) {
      if (!_.isString(name)) {
        throw new Error('Step name must be a string, got ' + typeof(name));
      } else if (typeof(definition) != 'function') {
        throw new Error('Step definition must be a function, got ' + typeof(definition));
      } else if (this.findStep(name)) {
        throw new Error('Step "' + name + '" is already defined');
      }

      this.steps.push({ name: name, definition: definition });
      return this;
    },

    // <a name="method-setNextStep"></a>
    // ### #setNextStep(name)
    // By default, steps are executed in order.
    // Call this method with the name of the step you want to go to once the
    // current one has completed.
    //
    //     scenario.step('step 1', function() {
    //       this.setNextStep('step 3');
    //     });
    //
    //     // this step will not be executed
    //     scenario.step('step 2', function() {
    //       doSomething();
    //     });
    //
    //     // this step will be executed
    //     scenario.step('step 3', function() {
    //       doSomethingElse();
    //     });
    setNextStep: function(name) {

      this.nextStep = this.findStep(name);
      if (!this.nextStep) {
        throw new Error('No such step "' + name + '"');
      }
    },

    // <a name="method-success"></a>
    // ### #success(args...)
    // Returns a resolved promise that can be used to pass multiple
    // results to the next step.
    //
    //     scenario.step('a step', function() {
    //       return this.success('foo', 'bar', 'baz');
    //     });
    //
    //     scenario.step('another step', function(a, b, c) {
    //       console.log(a + ' ' + b + ' ' + c); // "foo bar baz"
    //     });
    success: function() {
      return q(new StepArgs(slice.call(arguments)));
    },

    // <a name="method-skip"></a>
    // ### #skip(message, args...)
    // Returns a resolved promise similar to the one returned by `#success`.
    //
    // The first argument is a message describing the reason for skipping this step.
    // It will not be passed to the next step.
    //
    // Additionally, the step will end with a `step:skip` event rather than `step:done`.
    // See [Run Algorithm](#run%20algorithm).
    skip: function(message) {
      if (message && !_.isString(message)) {
        throw new Error('Skip message must be a string, got ' + typeof(message));
      }

      this.stepSkipped = true;
      this.skipMessage = message;

      return q(new StepArgs(slice.call(arguments, 1)));
    },

    // <a name="method-fail"></a>
    // ### #fail(errorMessage)
    // Returns a rejected promise that can be used to interrupt the scenario.
    //
    //     scenario.step('a step', function() {
    //       return this.fail('Oops...');
    //     });
    //
    //     // this step will not be executed, nor will any further steps
    //     scenario.step('another step', function() {
    //       console.log('yeehaw');
    //     });
    fail: function(err) {
      return q.reject(err);
    },

    // <a name="method-complete"></a>
    // ### #complete()
    // Marks the scenario as completed after the current step is executed.
    // Further steps will not be executed and the scenario will complete successfully.
    complete: function() {
      this.completed = true;
    },

    // ## Runtime Parameters Methods
    // Parameters can be passed as the `params` option to the constructor
    // or to the `#run` method. The latter will always override the former.

    addParam: function(name, options) {
      if (_.findWhere(this.parameters, { name: name })) {
        throw new Error('The parameter "' + name + '" is already defined');
      }

      var param = parameterFactory(name, options);
      this.parameters.push(param);

      return param;
    },

    // <a name="method-param"></a>
    // ### #param(name, options)
    // Returns the value of the parameter with the specified name.
    //
    //     var scenario = new Scenario({
    //       name: 'once upon a time',
    //       params: { foo: 'bar' }
    //     });
    //
    //     scenario.step('a step', function() {
    //       this.param('foo'); // "bar"
    //     });
    param: function(name) {
      if (!_.findWhere(this.parameters, { name: name })) {
        throw new Error('Unknown parameter "' + name + '"; add it to the Scenario object with the `addParam` method');
      }

      return this.parameterValues[name];
    },

    // ## Utility Methods
    // Also see [scenario.client.js](scenario.client.js.html) for methods to make HTTP calls.

    // <a name="method-defer"></a>
    // ### #defer()
    // Returns a deferred object from the [q](https://github.com/kriskowal/q) library.
    defer: function() {
      return q.defer();
    },

    // ## Internals

    // ### #configure(options)
    // Emits the `configure` event with the specified options.
    configure: function(options) {
      this.emit('configure', options);
    },

    // ### #onConfigure(options)
    // Called when the `configure` event is emitted.
    // Sets the base URL and the default request options.
    // See [scenario.client.js](scenario.client.js.html)
    onConfigure: function(options) {
      options = options || {};

      if (_.has(options, 'baseUrl')) {
        this.baseUrl = options.baseUrl;
      }

      if (options.defaultRequestOptions) {
        this.setDefaultRequestOptions(options.defaultRequestOptions);
      }

      if (options.log) {
        this.logger.setLevel(options.log.toUpperCase());
      }
    },

    // ### #findStep(name)
    // Returns the data object for the step with the specified name, or undefined if not found.
    //
    // A step data object has the `name` and `definition` properties corresponding to the name
    // and definition given when the `#step` method was called.
    findStep: function(name) {
      return _.findWhere(this.steps, { name: name });
    },

    // ### #getNextStep()
    // Returns the next step that will be executed.
    // That is either the step that was specified with `#setNextStep` or the step that was
    // defined after the current one.
    //
    // Returns undefined if there are no more steps to run.
    getNextStep: function() {

      var nextStep = this.nextStep;
      delete this.nextStep;

      return nextStep || this.steps[_.indexOf(this.steps, this.currentStep) + 1];
    },

    // ## Run Algorithm
    // Steps are executed using [promises](http://promises-aplus.github.io/promises-spec/) with
    // the [q](https://github.com/kriskowal/q) library. This allows steps to be asynchronous and
    // thrown errors to be caught by the promise chain.

    // ### #run(options)
    // Runs this scenario with the specified runtime options. Available options are the same
    // as for the [constructor](#constructor).
    //
    // Returns a promise that is resolved if the scenario completed successfully, or rejected
    // if any step fails and it was interrupted.
    run: function(options) {

      // An error is thrown if no steps are defined.
      if (!this.steps.length) {
        throw new Error('No step defined');
      }

      this.clearDefaultRequestOptions();

      // Run options are built by overriding construction options
      // with runtime options. Runtime options come from the command line and/or
      // configuration file; they are handled by [cli.command.js](cli.command.js.html).
      var runOptions = merge(this.baseOptions, options || {});

      return q.fcall(_.bind(this.ensureParameters, this), runOptions).then(_.bind(this.runScenario, this, runOptions));
    },

    runScenario: function(runOptions) {

      // **EVENT:** the `configure` event is emitted with the run options before the scenario starts.
      // Components listening to this event should update their configuration.
      this.configure(runOptions);

      // **EVENT:** the `scenario:start` event is emitted with the run options when the scenario starts.
      this.emit('scenario:start', runOptions);

      var deferred = q.defer();

      // The scenario always starts with the first step.
      this.runStep(_.first(this.steps), deferred);

      // The returned promise will be resolved when the last step of the scenario
      // is done executing, or if a step fails and the scenario is interrupted.
      return deferred.promise;
    },

    // ### #runStep(step, deferred, stepArgs...)
    // Runs the specified step.
    //
    // The second argument is the deferred object that must be resolved or rejected
    // to complete the scenario.
    //
    // The remaining arguments should be passed to the step definition function.
    runStep: function(step, deferred) {

      this.currentStep = step;
      delete this.stepSkipped;
      delete this.skipMessage;

      // The step description object is passed to all step events; it contains
      // the name of the step that is being executed.
      var description = { name: step.name },
          stepArgs = slice.call(arguments, 2);

      // **EVENT:** the `step:start` event is emitted before each step starts executing
      // with the step description object and the step arguments.
      this.emit.apply(this, [ 'step:start', description ].concat(stepArgs));

      // The step definition function is called with this scenario as the context
      // and with the step arguments. This is done with the q library so a promise
      // is returned and any errors are handled by the promise chain.
      var stepResult = q.fapply(_.bind(step.definition, this), stepArgs);

      // `#handleStepResult`  is called if the promise is resolved, `#handleStepError` otherwise.
      stepResult.then(_.bind(this.handleStepResult, this, deferred, description), _.bind(this.handleStepError, this, deferred, description));
    },

    // ### #handleStepResult(deferred, description, previousStepResults...)
    // Executes the next step or completes the scenario.
    handleStepResult: function(deferred, description) {

      // The results from the previous steps are given as additional arguments to this method.
      // If the result is a single `StepArgs` object (such as returned by `#success`),
      // the multiple results it contains are spread over the arguments of the next step's function.
      // This is what allows a step to pass multiple results to the next step even though
      // a promise can only be resolved with one value.
      var results = slice.call(arguments, 2);
      if (results.length == 1 && results[0] instanceof StepArgs) {
        results = results[0].args;
      }

      if (this.stepSkipped) {
        // **EVENT:** the `step:skip` event is emitted if the step was skipped.
        // The first argument is the step description object, the second argument
        // is the skip message, and remaining arguments are the results that will be
        // passed to the next step.
        this.emit.apply(this, [ 'step:skip', description, this.skipMessage ].concat(results));
      } else {
        // **EVENT:** the `step:done` event is emitted otherwise.
        // The first argument is the step description object, and remaining arguments
        // are the results that will be passed to the next step.
        this.emit.apply(this, [ 'step:done', description ].concat(results));
      }

      var nextStep = this.getNextStep();

      // The scenario is stopped if there are no more steps to run or if it was marked as completed.
      if (!nextStep || this.completed) {

        // **EVENT:** the `scenario:end` event is emitted when the scenario has finished running.
        this.emit('scenario:end');

        return deferred.resolve();
      }

      // The next step is run with the results from the previous step as arguments.
      this.runStep.apply(this, [ nextStep, deferred ].concat(results));
    },

    // ### #handleStepError(deferred, description, errorMessage)
    // Rejects the scenario deferred object with the specified error message.
    handleStepError: function(deferred, description, err) {

      // **EVENT:** the `step:error` event is emitted with the step description object and the error message if a step fails.
      this.emit('step:error', description, err);

      // **EVENT:** the `scenario:error` event is emitted with the error message if the scenario is interrupted.
      this.emit('scenario:error', err);

      deferred.reject(err);
    }

  // [HTTP client extensions](scenario.client.js.html) are added to the Scenario prototype.
  }, ScenarioClientExtensions, ScenarioParameterExtensions);

  // Utility class to hold multiple step arguments.
  // See `#success` and `#skip`.
  function StepArgs(args) {
    this.args = args;
  }

  return Scenario;
};
