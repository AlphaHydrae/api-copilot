# API Copilot

> Write testing or data population scenarios for your APIs.

[![NPM Version](https://badge.fury.io/js/api-copilot.png)](http://badge.fury.io/js/api-copilot)





## Installation

Install the command line utility:

    npm install -g api-copilot-cli

To set up your Node.js project to use API Copilot, install `api-copilot` as a development dependency:

    npm install --save-dev api-copilot

If your project is in another language, you can add this minimal `package.json` file to your project:

```json
{
  "name": "my-project",
  "version": "1.0.0",
  "private": true,
  "devDependencies": {
    "api-copilot": "^0.1.0"
  }
}
```

Then run `npm install`.
You may want to add the `node_modules` directory to your version control ignore file.

API Copilot expects your project to have an `api` directory containing **scenarios**.
Each scenario is a Node.js file that can be run by API Copilot.
It must end with `.scenario.js`.
The structure of a project containing only API Copilot scenarios might look like this:

```txt
api/foo.scenario.js
api/bar.scenario.js
api/baz.scenario.js
package.json
```



### Requirements

* [Node.js](http://nodejs.org) v0.10+





## Usage

* [Writing API Scenarios](#writing-api-scenarios)
* [Running Scenarios from the Command Line](#running-scenarios-from-the-command-line)
* [Configuration Options](#configuration-options)
* [Scenario Flow Control](#scenario-flow-control)
  * [Completing a step](#step-complete)
  * [Skipping a step](#step-skip)
  * [Failing](#step-fail)
  * [Asynchronous steps](#step-async)
  * [Change step order](#step-goto)
* [Making HTTP calls](#making-http-calls)
  * [Default Request Options](#default-request-options)
  * [Request Filters](#request-filters)



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



### Running Scenarios from the Command Line

The `api-copilot` command is provided by the separate [api-copilot-cli](https://github.com/lotaris/api-copilot-cli) package.
Install it with `npm install -g api-copilot-cli`.

Running `api-copilot` in your project will list available API scenarios and ask you which one you want to run.
If there is only one scenario, it will be run automatically.

Run `api-copilot --help` for instructions.



### Configuration Options

API Copilot can be given configuration options in three ways:

* as options to the Scenario object;
* from the `api-copilot.yml` file in the current working directory;
* as options on the command line (run `api-copilot --help` to see available options).

Command line options override options from the configuration file and both override the Scenario object options.

The following configuration options are supported:

* `log` - command line `-l, --log [level]`

  Log level (trace, debug or info). The default level is info.

* `source` - command line `-s, --source [dir]`

  Path to the directory where API scenarios are located.
  The default directory is `api`.
  The path can be absolute or relative to the current working directory.

* `baseUrl` - command line `-u, --base-url [url]`

  Override the base URL of the scenario.

* `showTime` - command line `-t, --show-time`

  Print the date and time with each log.

* `showRequest` - command line `-q, --show-request`

  Print options for each HTTP request (only with debug or trace log levels).

* `showResponseBody` - command line `-b, --show-response-body`

  Print response body for each HTTP request (only with debug or trace log levels).

Additionally, this command line option can be used to load another configuration file:

* `-c, --config [file]`

  Path to the configuration file.
  The default path is `api-copilot.yml`.
  The path can be absolute or relative to the current working directory.



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
      'X-Custom': 'value'
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

Clear previously configured default request options with `clearDefaultRequestOptions`:

```js
scenario.step('step 4', function(response) {

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

scenario.step('step 5', function(response) {

  // clear all default request options
  this.clearDefaultRequestOptions();

  // no additional options will be added
  return this.post({
    url: '/quxx',
    body: 'some text'
  });
});
```

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
  this.addRequestFilter('foo', anotherFooFilter);
  this.addRequestFilter('bar', barFilter);
  this.addRequestFilter('baz', bazFilter);

  // remove all filters with a given name or names
  this.removeRequestFilters('foo');
  this.removeRequestFilters('bar', 'baz');
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





## Contributing

* [Fork](https://help.github.com/articles/fork-a-repo)
* Create a topic branch - `git checkout -b feature`
* Push to your branch - `git push origin feature`
* Create a [pull request](http://help.github.com/pull-requests/) from your branch

Please add a changelog entry with your name for new features and bug fixes.





## License

API Copilot is licensed under the [MIT License](http://opensource.org/licenses/MIT).
See [LICENSE.txt](LICENSE.txt) for the full text.
