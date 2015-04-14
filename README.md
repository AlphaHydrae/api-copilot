# API Copilot

> Write testing or data population scenarios for your APIs.

**[Installation](#installation) &mdash; [Documentation](#documentation) &mdash; [Usage](#usage) &mdash; [Contributing](#contributing) &mdash; [License](#license)**

[![NPM version](https://badge.fury.io/js/api-copilot.svg)](http://badge.fury.io/js/api-copilot)
[![Build Status](https://travis-ci.org/AlphaHydrae/api-copilot.svg?branch=master)](https://travis-ci.org/AlphaHydrae/api-copilot)
[![Dependency Status](https://gemnasium.com/AlphaHydrae/api-copilot.svg)](https://gemnasium.com/AlphaHydrae/api-copilot)
[![License](https://img.shields.io/npm/l/api-copilot.svg)](http://opensource.org/licenses/MIT)

**Write an API scenario to make HTTP calls on your API:**

```js
var _ = require('underscore'),
    copilot = require('api-copilot');

var productsData = [
  [ 'Cheese', 2.45 ],
  [ 'Milk', 4 ],
  [ 'Wine', 10 ]
];

// create an API scenario
var scenario = new copilot.Scenario({
  name: 'My Scenario',
  summary: 'Populate some data into my API.',
  baseUrl: 'http://example.com/api',
  defaultRequestOptions: {
    json: true
  }
});

// define steps to run
scenario.step('create a user', function() {

  // make HTTP calls
  return this.post({
    url: '/users',
    body: {
      name: 'pgibbons',
      password: 'changeme'
    }
  });
});

// each step gets the result from the previous step
scenario.step('create 3 products', function(response) {

  var user = response.body;

  var requests = _.map(productsData, function(data) {
    return this.post({
      url: '/products',
      body: {
        title: data[0],
        price: data[1],
        userKey: user.key
      },
      expect: { statusCode: 201 }
    });
  }, this);

  // run HTTP requests in parallel
  return this.all(requests);
});

scenario.step('show created data', function(responses) {

  var products = _.pluck(responses, 'body');

  console.log(products.length + ' products created:');
  _.each(products, function(product) {
    console.log('- ' + product.title);
  });
});

// export the scenario for API Copilot to use
module.exports = scenario;
```

**Run it with API Copilot:**

```
api-copilot --log debug run myScenario
```

**See it in action:**

```
My Scenario
Base URL: none

STEP 1: create a user
Completed in 140ms

STEP 2: create 3 products
Completed in 1250ms

STEP 3: show created data
3 products created:
- Cheese
- Milk
- Wine
Completed in 2ms

DONE in 1.39s!
```





## Installation

To set up your project to use API Copilot for the first time, follow the [project setup procedure](#setup-project).
If you simply want to run API Copilot scenarios in a project where the setup procedure has already been done, jump to the [usage installation procedure](#setup-usage).

<a name="setup-project"></a>
### Project Setup Procedure

To set up a Node.js project to use API Copilot, install `api-copilot` as a development dependency:

    npm install --save-dev api-copilot

You can run this again whenever you want to upgrade to the latest version of API Copilot.

If your project is in another language, you can add this minimal `package.json` file to your project:

```json
{
  "name": "my-project",
  "version": "1.0.0",
  "private": true,
  "devDependencies": {
    "api-copilot": "^0.3.3"
  }
}
```

You should add the `node_modules` directory to your version control ignore file.

By default, API Copilot expects your project to have an `api` directory containing **scenarios**.
Each scenario is a Node.js file that can be run by API Copilot.
It must end with `.scenario.js`.
The structure of a project containing only API Copilot scenarios might look like this:

```txt
api/foo.scenario.js
api/bar.scenario.js
api/baz.scenario.js
package.json
```

<a name="setup-usage"></a>
### Usage Installation Procedure

Install the command line interface (you might have to use `sudo`):

    npm install -g api-copilot-cli

In your project's directory, install API Copilot and other dependencies:

    cd /path/to/project
    npm install

You're now ready to [run API Copilot](#cli).
If you don't have any API scenarios yet, you might want to [write some](#writing-api-scenarios).



### Requirements

* [Node.js](http://nodejs.org) v0.10+





## Documentation

This README is the main usage documentation.

Run `api-copilot --help` for command line usage information.

API Copilot uses external libraries to provide some of its functionality; refer to their documentation for more information:

* [HTTP requests with the request library](https://github.com/mikeal/request)
* [Promises with the q library](https://github.com/kriskowal/q)

The source code is also heavily commented and run through [Docker](https://github.com/jbt/docker), so you can read the resulting [**annotated source code**](http://lotaris.github.io/api-copilot/annotated/index.js.html) for more details about the implementation. It also contains inline examples.

Check the [CHANGELOG](CHANGELOG.md) for information about new features and breaking changes.





## Usage

<a name="toc"></a>

* [Writing API Scenarios](#writing-api-scenarios)
* [Running Scenarios from the Command Line](#cli)
  * [Listing available scenarios](#listing)
  * [Getting information about a scenario](#info)
  * [Running a scenario](#running)
* [Configuration Options](#configuration-options)
  * [Changing the configuration while a scenario is running](#changing-the-configuration-while-a-scenario-is-running)
* [Scenario Flow Control](#scenario-flow-control)
  * [Completing a step](#step-complete)
  * [Skipping a step](#step-skip)
  * [Failing](#step-fail)
  * [Completing the scenario](#scenario-complete)
  * [Asynchronous steps](#step-async)
  * [Change step order](#step-goto)
* [Making HTTP calls](#making-http-calls)
  * [Default request options](#default-request-options)
  * [Request filters](#request-filters)
  * [Expecting a specific response](#request-expect)
  * [Running requests in parallel](#request-parallel)
  * [Configuring the request pipeline](#request-pipeline)
* [Runtime Parameters](#runtime-parameters)
  * [Parameter options](#parameter-options)
  * [Loading parameters from another source](#loading-parameters)
  * [Documenting parameters](#documenting-parameters)
* [Multipart Form Data](#multipart-form-data)
* [Documenting Your Scenarios](#documenting)



### Writing API Scenarios

The first to do in a scenario file is require `api-copilot` and create a `Scenario` object:

```js
var copilot = require('api-copilot');

var scenario = new copilot.Scenario({
  name: 'My Demo Sample Data'
});
```

A scenario is basically a sequence of steps that you define using the `step` method.
The data returned by each step is available in the next step.

```js
scenario.step('create some data', function() {
  return 'some data';
});

scenario.step('log the data', function(data) {
  console.log(data);
});
```

Steps are executed in the order they are defined by default.
See [Flow Control](#scenario-flow-control) for more advanced behavior.

At the end of the file, you should export the scenario object:

```js
module.exports = scenario;
```

<a href="#toc" style="float:right;">Back to top</a>



<a name="cli"></a>
### Running Scenarios from the Command Line

The `api-copilot` command is provided by the separate [api-copilot-cli](https://github.com/lotaris/api-copilot-cli) package.
Install it with `npm install -g api-copilot-cli`.

API Copilot has two sub-commands which are documented below: `list` and `run`.
You may run `api-copilot --help` for command line instructions.

<a name="listing"></a>
#### Listing available scenarios

Use `api-copilot list` to list the scenarios available in the current source directory:

```bash
$\> cd /path/to/project && api-copilot list

Source directory: /path/to/project/api
  (use the `-s, --source <dir>` option to list API scenarios from another directory)

Available API scenarios (3):
1) api/foo.scenario.js       (foo)
2) api/bar.scenario.js       (bar)
3) api/sub/baz.scenario.js   (baz)

Run `api-copilot info [scenario]` for more information about a scenario.
Run `api-copilot run [scenario]` to run a scenario.
[scenario] may be either the number, path or name of the scenario.
```

By default, the source directory is the `api` directory relative to the current working directory (where you run API Copilot from).
For example, if you are in `/path/to/project`, API Copilot will look for scenarios in `/path/to/project/api`.
You may set a different source directory with the `-s, --source <dir>` option.

<a href="#toc" style="float:right;">Back to top</a>

<a name="info"></a>
#### Getting information about a scenario

Use `api-copilot info [scenario]` to get detailed information about a scenario.

```bash
$\> cd /path/to/project && api-copilot info api/my.scenario.js

API COPILOT SCENARIO

  Populates some data into my API.

  Name: My Scenario
  File: /path/to/project/api/my.scenario.js

PARAMETERS (3)

  foo=value (required)
    This is a required parameter.

  bar=/^https?:/
    This should be an HTTP or HTTPS URL.

  baz
    Activate some feature with this flag.

BASE CONFIGURATION

  Options given to the scenario object:
    {
      "name": "My Scenario"
    }

EFFECTIVE CONFIGURATION

  {
    "name": "My Scenario",
    "log": "info",
    "source": "samples"
  }

STEPS (3)

  1. do stuff
  2. do more stuff
  3. check stuff
```

The `info` command without a scenario argument will behave like the [run command](#running):
it will automatically run a single available scenario, or ask you which one you want to run if multiple scenarios are available.

<a href="#toc" style="float:right;">Back to top</a>

<a name="running"></a>
#### Running a scenario

Use `api-copilot run [scenario]` to run a scenario in the source directory.

If there is only one scenario available, it will be run automatically.
If multiple scenarios are found, API Copilot will display the list and ask you which one you want to run:

```bash
$\> cd /path/to/project && api-copilot run

Source directory: /path/to/project/api
  (use the `-s, --source <dir>` option to list API scenarios from another directory)

Available API scenarios (3):
1) api/foo.scenario.js       (foo)
2) api/bar.scenario.js       (bar)
3) api/sub/baz.scenario.js   (baz)

Type the number, path or name of the scenario you want to run:
```

Auto-completion is provided for scenario names.

If multiple scenarios are available, you can also directly run one by specifying its number, path or name as argument to the `run` command:

```bash
api-copilot run 1
api-copilot run api/foo.scenario.js
api-copilot run foo
```

<a href="#toc" style="float:right;">Back to top</a>



<a name="configuration-options"></a>

### Configuration Options

API Copilot can be given configuration options in multiple ways:

* as options to the Scenario object;
* from [YAML](http://www.yaml.org) configuration files:
  * the `.api-copilot.yml` file in your home directory;
  * the `api-copilot.yml` file in the current working directory;
  * other configuration files specified with the `config` option;
* from environment variables;
* as options on the command line (run `api-copilot --help` to see available options).

Each of these option sources has greater precedence than the previous one.
For example, an option given on the command line will always overwrite the value of the same option read from a configuration file or given through an environment variable.

The following configuration options are supported:

* `log` &mdash; command line `-l, --log <level>` &mdash; env var `API_COPILOT_LOG=<level>`

  Log level (trace, debug or info). The default level is info. Use trace to see the stack trace of errors.

* `source` &mdash; command line `-s, --source <dir>` &mdash; env var `API_COPILOT_SOURCE=<dir>`

  Path to the directory where API scenarios are located.
  The default directory is `api`.
  The path can be absolute or relative to the current working directory.

* `baseUrl` &mdash; command line `-u, --base-url <url>` &mdash; env var `API_COPILOT_BASE_URL=<url>`

  Override the base URL of the scenario.
  Only the paths of URLs will be printed in debug mode.

* `showTime` &mdash; command line `-t, --show-time` &mdash; env var `API_COPILOT_SHOW_TIME=1`

  Print the date and time with each log.

* `showRequest` &mdash; command line `-q, --show-request` &mdash; env var `API_COPILOT_SHOW_REQUEST=1`

  Print options for each HTTP request (only with debug or trace log levels).

* `showResponseBody` &mdash; command line `-b, --show-response-body` &mdash; env var `API_COPILOT_SHOW_RESPONSE_BODY=1`

  Print response body for each HTTP request (only with debug or trace log levels).

* `showFullUrl` &mdash; command line `--show-full-url` &mdash; env var `API_COPILOT_SHOW_FULL_URL=1`

  Always print full URLs even when a base URL is configured (only with debug or trace log levels).

* `requestPipeline` &mdash; command line `--request-pipeline <n>` &mdash; env var `API_COPILOT_REQUEST_PIPELINE=<n>`

  Maximum number of HTTP requests to run in parallel (no limit by default).
  See [request pipeline](#request-pipeline).

* `requestCooldown` &mdash; command line `--request-cooldown <ms>` &mdash; env var `API_COPILOT_REQUEST_COOLDOWN=<ms>`

  If set and an HTTP request ends, no other request will be started before this time (in milliseconds) has elapsed (no cooldown by default).
  See [request pipeline](#request-pipeline).

* `requestDelay` &mdash; command line `--request-delay <ms>` &mdash; env var `API_COPILOT_REQUEST_DELAY=<ms>`

  If set and an HTTP request starts, no other request will be started before this time (in milliseconds) has elapsed (no delay by default).
  See [request pipeline](#request-pipeline).

  <a name="summary-option"></a>

* `summary`

  Short summary explaining what your scenario does.
  This will be displayed in the [info command](#info) output.

  This option cannot be changed on the command line.

<a name="configuration-files"></a>

Additionally, these command-line- and environment-only options can be used to customize from which configuration files options are read from:

* `-c, --config <file>` &mdash; env var `API_COPILOT_CONFIG=<file>`

  Add a configuration file to read options from.
  The path can be absolute or relative to the current working directory.
  This option can be used multiple times.

  **WARNING:** note that by default, API Copilot will attempt to read `~/.api-copilot.yml` and `$PWD/api-copilot.yml`.
  Using the `--config` option disables these default configuration files unless you also set the `--default-configs` option.

* `--default-configs` &mdash; env var `API_COPILOT_DEFAULT_CONFIGS=1`

  In conjunction with the `--config` option, this causes the default configuration files
  (`~/.api-copilot.yml` and `$PWD/api-copilot.yml`) to still be read instead of being ignored.

<a href="#toc" style="float:right;">Back to top</a>



#### Changing the Configuration while a Scenario is Running

In any step of the scenario, you may change the configuration with the `configure` method:

```js
var scenario = new Scenario({
  name: 'myScenario',
  summary: 'Populates some data into my API.',
  baseUrl: 'http://example.com/foo'
});

scenario.step('first step', function() {

  // this HTTP request will use the baseUrl configured above
  return this.get({ url: '/' });
});

scenario.step('second step', function(response) {
  
  // change the baseUrl
  this.configure({ baseUrl: 'http://example.com/bar' });

  // this HTTP request will use the newly configured baseUrl
  return this.get({ url: '/' });
});
```

<a href="#toc" style="float:right;">Back to top</a>



### Scenario Flow Control

<a name="step-complete"></a>
To **complete a step** and send a result to the next step, you can simply return the result:

```js
scenario.step('compute data', function() {
  return computeSomeDataSynchronously();
});

scenario.step('log data', function(data) {
  console.log(data);
});
```

Note that this only works for *synchronous* steps.
[Asynchronous steps](#step-async) and [HTTP Calls](#making-http-calls) are described later.

If you want to **pass multiple results** to the next step, use the `success` method:

```js
scenario.step('compute data', function() {
  return this.success('foo', 'bar', 'baz');
});

scenario.step('log data', function(result1, result2, result3) {
  console.log(result1);
  console.log(result2);
  console.log(result3);
});
```

Again, this is only for synchronous steps.

<a name="step-skip"></a>
To **skip a step** and log an informational message, use the `skip` method:

```js
scenario.step('compute data', function() {
  if (someCondition) {
    return this.skip('no computation needed');
  } else {
    return 'some data';
  }
});
```

<a name="step-fail"></a>
To **fail a step** and stop the whole scenario, use the `fail` method:

```js
scenario.step('log data', function(data) {
  if (data == null) {
    return this.fail('data was not computed');
  }
  console.log(data);
});
```

Or you can simply throw an error:

```js
scenario.step('log data', function(data) {
  if (data == null) {
    throw new Error('data was not computed');
  }
  console.log(data);
});
```

<a name="scenario-complete"></a>
To **complete the scenario** successfully and not run any more steps, use the `complete` method:

```js
scenario.step('might be done here', function(done) {
  if (done) {
    // further steps will not be executed
    return this.complete();
  }

  // otherwise continue
  return computeSomeStuff();
});
```

<a name="step-async"></a>
To make an **asynchronous step**,
return a [promise](http://promises-aplus.github.io/promises-spec/) instead of a value (see the [q](https://github.com/kriskowal/q) library).

API Copilot provides you the `defer` method to generate a deferred object.
This object has a promise property which you can return;
then resolve or reject the deferred object once your asynchronous operation is complete.

```js
scenario.step('async step', function() {

  var deferred = this.defer();

  // this operation is asynchronous, so it will be executed later
  asyncStuff('input', function(err, result) {
    if (err) {
      deferred.reject(err);
    } else {
      deferred.resolve(result);
    }
  });

  // return the promise object
  return deferred.promise;
});
```

You can simplify callback-based asynchronous code by requiring [q](https://github.com/kriskowal/q) and using its [Node adaptation functions](https://github.com/kriskowal/q#adapting-node):

```js
var q = require('q');

scenario.step('async step', function() {
  return q.nfcall(asyncStuff, 'input');
});
```

To do this, you must add `q` to your own development dependencies by running `npm install --save-dev q`.

You may also return any promise that follows the [Promises/A+ standard](http://promises-aplus.github.io/promises-spec/).

<a name="step-goto"></a>
To **continue with another step than the next one**, call the `setNextStep` method at any time during the execution of the current step:

```js
scenario.step('first step', function() {
  this.setNextStep('third step');
  return this.success('some data');
});

scenario.step('second step', function() {
  // this step will be skipped
});

scenario.step('third step', function(data) {
  console.log(data);
});
```

<a href="#toc" style="float:right;">Back to top</a>



### Making HTTP Calls

API Copilot includes the [request](https://github.com/mikeal/request) library to make HTTP calls.

Use the `get`, `head`, `post`, `put`, `patch` and `delete` methods to start a call.
These methods return a promise thath you can return from your step.
The next step will receive the HTTP response.

```js
scenario.step('call API', function() {
  return this.get({
    url: 'http://example.com/'
  });
});

scenario.step('log response body', function(response) {
  console.log(response.body); // response body string
});
```

You can also use the more generic `request` method that supports any HTTP verb:

```js
scenario.step('an API call', function() {
  return this.request({
    method: 'GET',
    url: 'http://example.com/'
  });
});
```

If an I/O error occurs, the error message will be logged and the scenario will stop.

Note that server errors do not interrupt the scenario.
It is your responsibility to check the response from the server:

```js
scenario.step('an API call', function() {
  return this.get({
    url: 'http://example.com'
  });
});

scenario.step('handle API data', function(response) {
  if (response.statusCode != 200) {
    return this.fail('server responded with unexpected status code ' + response.statusCode);
  }
  console.log(response.body);
});
```

Passing the **json option** causes the request body and response body to be serialized/deserialized as JSON:

```js
scenario.step('an API call', function() {
  return this.post({
    url: 'http://example.com',
    json: true,
    body: {
      foo: 'bar'
    }
  }); // the request body will be {"foo":"bar"}
});

scenario.step('handle API data', function(response) {
  console.log(response.body); // the body will be a javascript object: { foo: 'bar' }
});
```

Read the [request documentation](https://github.com/mikeal/request#requestoptions-callback) for more HTTP configuration options.

<a href="#toc" style="float:right;">Back to top</a>

#### Default Request Options

If you need to re-use options for many requests, you can use `setDefaultRequestOptions` in a step.
It will apply the specified options to all subsequent requests.

```js
scenario.step('step 1', function() {

  this.setDefaultRequestOptions({
    json: true
  });

  // the `json` option will be added to this request
  return this.post({
    url: '/foo',
    body: {
      some: 'data'
    }
  });
});

scenario.step('step 2', function(response) {

  // this request will also have the `json` option
  return this.post({
    url: '/bar',
    body: {
      more: 'data'
    }
  });
});
```

You can also extend default request options (without overriding all of them) with `extendDefaultRequestOptions`:

```js
scenario.step('step 3', function(response) {

  this.extendDefaultRequestOptions({
    headers: {
      'X-Custom': 'value',
      'X-Custom-2': 'value 2'
    }
  });

  // this request will have both the `json` and `headers` options
  return this.post({
    url: '/baz',
    body: {
      more: 'data'
    }
  });
});
```

<a name="defaultRequestOptions-merge"></a>
If you need to add options to a sub-object, like `headers`, use `mergeDefaultRequestOptions`:

```js
scenario.step('step 4', function(response) {

  this.mergeDefaultRequestOptions({
    headers: {
      // add a header without overriding previous ones
      'X-Custom-B': 'value B',
      // also clear a specific header without clearing them all
      'X-Custom-2': undefined
    }
  });

  // this request will have the X-Custom and X-Custom-B headers,
  // while the X-Custom-2 header was cleared
  return this.post({
    url: '/baz',
    body: {
      more: 'data'
    }
  });
});
```

Clear previously configured default request options with `clearDefaultRequestOptions`:

```js
scenario.step('step 5', function(response) {

  // clear specific request option(s) by name
  this.clearDefaultRequestOptions('headers');

  // this request will only have the `json` option added since the `headers` option was cleared
  return this.post({
    url: '/qux',
    body: {
      more: 'data'
    }
  });
});

scenario.step('step 6', function(response) {

  // clear all default request options
  this.clearDefaultRequestOptions();

  // no additional options will be added
  return this.post({
    url: '/quxx',
    body: 'some text'
  });
});
```

<a href="#toc" style="float:right;">Back to top</a>

#### Request Filters

Request filters are run just before an HTTP call is made, allowing you to customize the request based on all its options:

```js
// define a filter function
// the `requestOptions` argument will be the actual options passed to the request library
function signRequest(requestOptions) {

  requestOptions.headers = {
    'X-Signature': sha1(requestOptions.method + '\n' + requestOptions.url)
  };

  // the filter function must return the updated request options
  return requestOptions;
}

scenario.step('HTTP call with signature authentication', function() {

  // add the filter
  this.addRequestFilter(signRequest);

  // the X-Signature header will automatically be added to this and subsequent requests
  this.get({
    url: '/foo'
  });
});
```

Remove request filters with `removeRequestFilters`:

```js
scenario.step('another step', function() {

  // remove specific request filter(s)
  this.removeRequestFilters(signRequest);

  // remove all requests filters
  this.removeRequestFilters();
});
```

You can also identify filters by name:

```js
scenario.step('HTTP call with named filters', function() {

  // add named filters
  this.addRequestFilter('foo', fooFilter);
  this.addRequestFilter('bar', barFilter);
  this.addRequestFilter('baz', bazFilter);

  // adding a new filter for the same name overrides the previous filter
  this.addRequestFilter('foo', anotherFooFilter);

  // remove filters with a given name or names
  this.removeRequestFilters('foo');
  this.removeRequestFilters('bar', 'baz');

  // remove all request filters
  this.removeRequestFilters();
});
```

You can make a request filters asynchronous by returning a promise for the request options:

```js
scenario.step('asynchronous filters', function() {

  this.addRequestFilter('signature', function(requestOptions) {

    // make a deferred object with the q library
    var deferred = q.defer();

    // launch your asynchronous operation
    getSomeAsyncRequestOptions(requestOptions, function(err, options) {
      if (err) {
        return deferred.reject(err);
      }

      // resolve the deferred object when done
      deferred.resolve(options);
    });

    // return the promise
    return deferred.promise;
  });

  this.get({
    url: '/foo'
  });
});
```

<a href="#toc" style="float:right;">Back to top</a>

<a name="request-expect"></a>
#### Expecting a Specific Response

You can specify expected properties of an HTTP response with the `expect` option.

To check that the status code is the one you expect, specify an expected `statusCode`:

```js
scenario.step('step', function() {

  return this.post({
    url: 'http://example.com/foo',
    body: {
      some: 'data'
    },
    expect: {
      // the request will fail and the scenario will be interrupted
      // if the status code of the response is not the expected one
      statusCode: 201
    }
  });
});
```

Check that the code is in a given range using a regular expression:

```js
scenario.step('step', function() {

  return this.post({
    url: 'http://example.com/foo',
    body: {
      some: 'data'
    },
    expect: {
      // the request will fail and the scenario will be interrupted
      // if the status code of the response is not in the 2xx range
      statusCode: /^2/
    }
  });
});
```

You can also specify an array of expected status codes:

```js
scenario.step('step', function() {
  return this.get({
    url: 'http://example.com',
    expect: {
      // the request will fail and the scenario will be interrupted
      // if the status code of the response is not among these
      statusCode: [ 200, 204, /^3/ ]
    }
  });
});
```

<a name="request-expect-custom-message"></a>

To specify a custom error message, pass an object with the expected
value as the `value` option, and the message as the `message` option:

```js
scenario.step('step', function() {
  return this.get({
    url: 'http://example.com',
    expect: {
      statusCode: {
        value: /^2/,
        message: 'Must be in the 2xx range.'
      }
    }
  });
});
```

To build an error message from the expected and actual values,
pass a function as the `message` option:

```js
scenario.step('step', function() {
  return this.get({
    url: 'http://example.com',
    expect: {
      statusCode: {
        value: [ 200, 201, 204 ],
        message: function(expected, actual) {
          return "Expected " + actual + " to be in " + expected;
        }
      }
    }
  });
});
```

<a name="request-parallel"></a>
#### Running requests in parallel

Pass an array of HTTP requests to the `all` method to run them in parallel:

```js
scenario.step('many HTTP calls', function() {
  return this.all([
    this.get('http://example.com/foo'),
    this.get('http://example.com/bar'),
    this.get('http://example.com/baz')
  ]);
});

scenario.step('handle responses', function(responses) {
  // you get the three responses in the next step
  // when all requests have completed
  responses.length; // #=> 3
});
```

The `all` method turns an array of promises into a single promise that is resolved
when all the promises in the array have been resolved. The resolution value will be
an array of the resolved values.

Read about [q combinations](https://github.com/kriskowal/q#combination) for more information.

<a href="#toc" style="float:right;">Back to top</a>

<a name="request-pipeline"></a>
#### Configuring the request pipeline

[Parallelism](#request-parallel) might be an issue in some situations.
Maybe your backend cannot handle as many concurrent requests as are issued by your scenario,
or maybe your API limits the frequency of calls.

The request pipeline allows you to limit how often HTTP requests are started.
It has three [configuration options](#configuration-options).

* **requestPipeline** &mdash; `<n>`

  This limits the number of HTTP requests that can be made in parallel.
  For example, if set to 3, no more than 3 HTTP requests will run concurrently at any given time.

```js
scenario.step('limit request concurrency', function() {

  scenario.configure({ requestPipeline: 3 });

  return this.all([

    // the first three requests will be executed concurrently
    this.get({ url: 'http://example.com/a' }),   // starts at time 0, takes 50ms
    this.get({ url: 'http://example.com/b' }),   // starts at time 0, takes 100ms
    this.get({ url: 'http://example.com/c' }),   // starts at time 0, takes 100ms

    // the next three requests will start one by one as soon as each of the first three finishes
    this.get({ url: 'http://example.com/d' }),   // starts at time 50, after the first request finishes
    this.get({ url: 'http://example.com/e' }),   // starts at time 100, after the second request finishes
    this.get({ url: 'http://example.com/f' })    // starts at time 100, after the third request finishes
  ]);
});
```

* **requestCooldown** &mdash; `<ms>`

  When set, the request cooldown guarantees that after an HTTP request end,
  no other request will start before the cooldown time (in milliseconds) has elapsed.

```js
scenario.step('wait after each request', function() {

  scenario.configure({ requestPipeline: 1, requestCooldown: 250 });

  // after the first HTTP request, each request will wait for the previous one to finish,
  // since the request pipeline is set to 1, and then 250 additional milliseconds (the
  // request cooldown), before starting
  return this.all([
    this.get({ url: 'http://example.com/a' }),   // starts at time 0, takes 100ms
    this.get({ url: 'http://example.com/b' }),   // starts at time 350 (last response time + cooldown), takes 100ms
    this.get({ url: 'http://example.com/c' }),   // starts at time 700 (last response time + cooldown), takes 100ms
    this.get({ url: 'http://example.com/d' }),   // starts at time 1050 (last response time + cooldown), takes 100ms
  ]);
});
```

* **requestDelay** &mdash; `<ms>`

  When set, the request delay guarantees that after an HTTP request starts,
  no other request will start before the delay time (in milliseconds) has elapsed.
  This can be used to spread out concurrent requests so that they are not all
  started at exactly the same time.

```js
scenario.step('wait after each request', function() {

  scenario.configure({ requestDelay: 50 });

  // each request will start 50ms after the previous one has started
  // but they will still run concurrently if they take more than 50ms to complete
  return this.all([
    this.get({ url: 'http://example.com/a' }),   // starts at time 0
    this.get({ url: 'http://example.com/b' }),   // starts at time 50
    this.get({ url: 'http://example.com/c' }),   // starts at time 100
    this.get({ url: 'http://example.com/d' }),   // starts at time 150
  ]);
});
```

<a href="#toc" style="float:right;">Back to top</a>



### Runtime Parameters

Scenarios can be configured to take custom runtime parameters with the `addParam` method:

```js
var scenario = new Scenario({
  name: 'scenario with parameters'
});

scenario.addParam('foo');
scenario.addParam('bar', { flag: true });
```

These parameters can then be supplied on the command line:

```
#> api-copilot -p foo=value -p bar
```

Retrieve them with the `param` method when running the scenario:

```js
scenario.step('step', function() {
  this.param('foo');   // "value"
  this.param('bar');   // true
});
```

Note that all parameters must be registered with the `addParam` method.
Trying to retrieve unknown parameters will throw an error and stop the scenario.

```js
scenario.step('step', function() {
  this.param('unknown'); // throws Error
});
```

Use the [info command](#info) to obtain a list of the parameters for a scenario.
See [parameter options](#parameter-options) on how to configure and document parameters.

<a href="#toc" style="float:right;">Back to top</a>

<a name="parameter-options"></a>
#### Parameter options

<a name="parameter-option-required"></a>

* **required** &mdash; `boolean, default: true`

  Parameters are required by default.
  Set this option to `false` to make them optional.

```js
scenario.addParam('optionalFeature', {
  required: false
});
```

  If you try to run a scenario without giving a value for a required parameter, you will be prompted to enter a value:

```
The scenario cannot be run because the following parameters are either missing or invalid:
- foo is required; set it with `-p foo=value` or `--param foo=value`

You will now be asked for the missing or corrected values.
Press Ctrl-C to quit.

foo=value (required)
  This is a required parameter.

Enter a value for foo: 
```

<a name="parameter-option-default"></a>

* **default** &mdash; `any, default: undefined`

  Default value of the parameter when not configured.

```js
scenario.addParam('url',  {
  default: 'http://example.com'
});
```

<a name="parameter-option-flag"></a>

* **flag** &mdash; `boolean, default: false`

  Set this option to `true` to make your parameter a boolean flag.

  Boolean flags are specified without a value on the command line: `-p foo` or `--params foo`.
  Trying to give them a value will produce an error and prevent the scenario from running.

  When retrieving the value with the `param` method in a scenario, it will be either `true` or `undefined` (if the flag was not given).

```js
scenario.addParam('coolFeature', {
  flag: true
});
```

* **pattern** &mdash; `regexp, default: none`

  Validate your parameter with a regular expression.

  The scenario will only run if the supplied parameter value matches;
  otherwise, you will be prompted for a new value.

```js
scenario.addParam('backendUrl', {
  pattern: /^https?:/
});
```

<a name="parameter-option-description"></a>

* **description** &mdash; `string, default: none`

  Additional documentation for your parameter.
  It will be displayed in the [info command](#info) output.

```js
scenario.addParam('backendUrl', {
  description: 'The URL to our cool backend. Must be HTTPS.'
});
```

Sample output:

```
backendUrl=value (required)
  The URL to our cool backend. Must be HTTPS.
```

* **valueDescription** &mdash; `string, default: none`

  Custom value description for your parameter.

  The default description of a parameter is `foo=value`.
  If you specified a `pattern` option, it will print the pattern instead, e.g. `backendUrl=/^https?:/`.

  Set a `valueDescription` to customize this.

```js
scenario.addParam('backendUrl', {
  valueDescription='url'
});
```

Sample output:

```
backendUrl=url
```

<a name="parameter-option-obfuscate"></a>

* **obfuscate** &mdash; `boolean, default: false`

  If set, the value of this parameter will be obfuscated when displayed
  before the scenario starts running.

  Note that this is automatically set for parameters whose name contains
  the words `password`, `secret` or `authToken` (case-insensitive). If you
  have such a parameter that you do not want obfuscated, set the option
  to `false`.

```js
scenario.addParam('password');

scenario.addParam('foo', {
  obfuscate: true
});
```

Sample output when running a scenario:

```
Runtime parameters:
  password = "************"
  foo = "***"
```

<a name="parameter-option-processor"></a>

* **processor** &mdash; `function(value, previousValue), default: none`

  If set, the parameter will take the value obtained by calling this function with the configured value.
  If a default value is set, it will be given as second argument.
  This can be used to coerce values of a given type, such as numbers.

```js
scenario.addParam('n', {
  processor: parseInt
});
```

  If a parameter is given multiple times at the command line,
  or is an array in the scenario object or configuration file,
  the processor function will be called once for each value, with that value as the first argument.
  The second argument will be the result returned by the processor function for the previous value, or the default value the first time.

  This can be used to construct a parameter value from multiple values.

```js
// this scenario can use multiple URLs
scenario.addParam('urls', {

  // start with an empty list
  default: [],

  // every time a -p urls=<url> is given, add it to the list
  processor: function(value, urls) {
    urls.push(value);
    return urls;
  }
});

// if called with `-p urls=http://example.com/a -p urls=http://example.com/b`,
// the value of the `urls` parameter will be [ "http://example.com/a", "http://example.com/b" ]
```

<a href="#toc" style="float:right;">Back to top</a>

<a name="loading-parameters"></a>
#### Loading parameters from another source

By default, runtime parameters can come from three sources:

* the options given to the scenario object;
* the YAML configuration file;
* command line parameters.

To load more parameters from elsewhere, add a **loading function** to your scenario object with the `loadParametersWith` method:

```js
var scenario = new Scenario({
  name: 'scenario with lots of parameters',
  params: { some: 'initial', parameter: 'values' }
});

// load more parameters from anywhere
scenario.loadParametersWith(function(params) {

  // each loading function is passed all previously loaded parameters,
  // including those from options, the configuration file and the command line
  params.more = 'parameters';

  // each loading function must return the updated parameters
  return params;
});

// return a promise to support asynchronous parameter loading
scenario.loadParametersWith(function() {

  var deferred = q.defer(); // promises with the q library

  loadParametersAsynchronously(function(err, moreParams) {
    if (err) {
      return deferred.reject(err);
    }

    // resolve the promise once the parameters have been loaded
    deferred.resolve(moreParams);
  });

  // return a promise for the updated parameters
  return deferred.promise;
});
```

Parameter loading functions are run in the order they are added to the scenario object.

<a href="#toc" style="float:right;">Back to top</a>

<a name="documenting-parameters"></a>
#### Documenting parameters

In addition to the [description option](#parameter-option-description) shown above,
the `addParam` method returns a parameter object which will emit a `describe` event when its documentation is printed.

You can listen to this event to print more documentation:

```js
var myParam = scenario.addParam('myParam');

myParam.on('describe', function(print) {

  // use the provided print function to have your text correctly indented
  print('More');
  print('information.');

  // it supports new lines as well
  print('Even\nmore\ninformation.');
});
```

Sample info output:

```
myParam=value
  More
  information.
  Even
  more
  information.
```

<a href="#toc" style="float:right;">Back to top</a>



### Multipart Form Data

The [request](https://github.com/mikeal/request) library included in API Copilot supports `multipart/form-data` requests with the [form-data](https://github.com/felixge/node-form-data) library.
Check out [its documentation about forms](https://github.com/mikeal/request#forms).
Using only the request library, this is how you would upload a file:

```js
var fs = require('fs');

var r = request.post('http://example.com/upload', function(err, response, body) {
  if (err) {
    return console.error('Upload failed: ' + err);
  }
  console.log('Upload successful! Server responded with: ' + body);
})

var form = r.form()
form.append('my_file', fs.createReadStream('/path/to/file.ext'));
```

To retrieve the request object and create a form with API Copilot, you will need to supply a handler function.
The handler function is called with the request object before the HTTP request starts.

```js
var fs = require('fs');

function createFileUploadHandler(file) {
  return function (request) {
    var form = request.form();
    form.append('file', fs.createReadStream(file));
  };
}

scenario.step('file upload', function() {

  var file = '/path/to/file.ext';

  return this.post({
    url: 'http://example.com/',
    handler: createFileUploadHandler(file)
  });
});
```

**Note:** the request handler must be synchronous since the HTTP request will start immediately at the next tick.

<a href="#toc" style="float:right;">Back to top</a>



<a name="documenting"></a>
### Documenting Your Scenarios

Scenarios with many parameters can become quite complicated to understand and use.

Start by specifying a short [summary](#summary-option).
Then document your parameters with the [description option](#parameter-option-description) and the [describe event](#documenting-parameters).

To add additional documentation at the end of the [info command](#info) output, listen to the `scenario:info` event on the scenario object:

```js
var copilot = require('api-copilot');

var scenario = new copilot.Scenario({
  name: 'My Complex Scenario'
});

scenario.on('scenario:info', function() {
  console.log('Additional Information:');
  console.log();
  console.log('  To use this scenario, you must ... and ... first.');
  console.log();
});

```

<a href="#toc" style="float:right;">Back to top</a>





## Contributing

* [Fork](https://help.github.com/articles/fork-a-repo)
* Create a topic branch - `git checkout -b feature`
* Push to your branch - `git push origin feature`
* Create a [pull request](http://help.github.com/pull-requests/) from your branch

Please add a changelog entry with your name for new features and bug fixes.





## License

API Copilot is licensed under the [MIT License](http://opensource.org/licenses/MIT).
See [LICENSE.txt](LICENSE.txt) for the full text.
