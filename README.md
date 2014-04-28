# API Copilot

> Write testing or data population scenarios for your APIs.

[![NPM version](https://badge.fury.io/js/api-copilot.svg)](http://badge.fury.io/js/api-copilot)





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

This README is the main documentation.

The source is also heavily commentted and run through [Docker](https://github.com/jbt/docker), so you can read the resulting annotated source code for more details about the implementation. It also contains inline examples.

[**View the Annotated Source Code**](http://lotaris.github.io/api-copilot/annotated/index.js.html)





## Usage

* [Writing API Scenarios](#writing-api-scenarios)
* [Running Scenarios from the Command Line](#cli)
  * [Listing available scenarios](#listing)
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
* [Runtime Parameters](#runtime-parameters)
* [Multipart Form Data](#multipart-form-data)



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
[scenario] may be either the number, path or name of the scenario.
```

By default, the source directory is the `api` directory relative to the current working directory (where you run API Copilot from).
For example, if you are in `/path/to/project`, API Copilot will look for scenarios in `/path/to/project/api`.
You may set a different source directory with the `-s, --source <dir>` option.

<a name="running"></a>
#### Running a scenario

Use `api-copilot run` to run a scenario in the source directory.

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



### Configuration Options

API Copilot can be given configuration options in three ways:

* as options to the Scenario object;
* from the `api-copilot.yml` file in the current working directory;
* as options on the command line (run `api-copilot --help` to see available options).

Command line options override options from the configuration file and both override the Scenario object options.

The following configuration options are supported:

* `log` - command line `-l, --log [level]`

  Log level (trace, debug or info). The default level is info. Use trace to see the stack trace of errors.

* `source` - command line `-s, --source [dir]`

  Path to the directory where API scenarios are located.
  The default directory is `api`.
  The path can be absolute or relative to the current working directory.

* `baseUrl` - command line `-u, --base-url [url]`

  Override the base URL of the scenario.
  Only the paths of URLs will be printed in debug mode.

* `showTime` - command line `-t, --show-time`

  Print the date and time with each log.

* `showRequest` - command line `-q, --show-request`

  Print options for each HTTP request (only with debug or trace log levels).

* `showResponseBody` - command line `-b, --show-response-body`

  Print response body for each HTTP request (only with debug or trace log levels).

* `showFullUrl` - command line `--show-full-url`

  Always print full URLs even when a base URL is configured (only with debug or trace log levels).

Additionally, this command line option can be used to load another configuration file:

* `-c, --config [file]`

  Path to the configuration file.
  The default path is `api-copilot.yml`.
  The path can be absolute or relative to the current working directory.



#### Changing the Configuration while a Scenario is Running

In any step of the scenario, you may change the configuration with the `configure` method:

```js
var scenario = new Scenario({
  name: 'once upon a time',
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



### Runtime Parameters

Scenarios can be given runtime parameters on the command line:

```
#> api-copilot -p foo -p bar=baz
```

These parameters can then be retrieved with the `param` method:

```js
scenario.step('step', function() {
  this.param('foo');   // true
  this.param('bar');   // "baz"
});
```

By default, trying to retrieve an unknown parameter will throw an error and stop the scenario.

```js
scenario.step('step', function() {
  this.param('unknown'); // throws Error
});
```

To customize the error message, use the `message` option when calling `param`:

```js
scenario.step('step', function() {
  this.param('unknown', { message: 'can i haz unknown param?' }); // throws new Error('can i haz unknown param?')
});
```

To disable this behavior, set the `required` option to false when calling `param`:

```js
scenario.step('step', function() {
  this.param('qux', { required: false });   // undefined
});
```

If you want to make sure certain parameters are present before running your scenario, use the `requireParameters` method before defining steps:

```js
scenario.requireParameters('foo', 'bar');

scenario.step('step 0', function() {
  // ...
});
```

An error will be thrown immediately upon trying to start the scenario if any required parameter is missing.



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





## Contributing

* [Fork](https://help.github.com/articles/fork-a-repo)
* Create a topic branch - `git checkout -b feature`
* Push to your branch - `git push origin feature`
* Create a [pull request](http://help.github.com/pull-requests/) from your branch

Please add a changelog entry with your name for new features and bug fixes.





## License

API Copilot is licensed under the [MIT License](http://opensource.org/licenses/MIT).
See [LICENSE.txt](LICENSE.txt) for the full text.
