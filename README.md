# API Copilot

> Write testing or data population scenarios for your APIs.

[![NPM Version](https://badge.fury.io/js/api-copilot.png)](http://badge.fury.io/js/api-copilot)

## Installation

```sh
npm install --save-dev api-copilot
npm install -g api-copilot-cli # command line utility
```

### Requirements

* [Node.js](http://nodejs.org) v0.10+

## Usage

* [Project Setup](#projectsetup)
* [API Scenarios](#apiscenarios)
* [Flow Control](#flowcontrol)
  * [Completing a step](#step-complete)
  * [Skipping a step](#step-skip)
  * [Failing](#step-fail)
  * [Asynchronous steps](#step-async)
* [HTTP calls](#httpcalls)
* [Command Line](#commandline)

### Project Setup

API Copilot expects your project to have an `api` directory containing **scenarios**.
For example, your project structure might look like this:

```txt
api/foo.scenario.js
api/bar.scenario.js
src/myCode.js
package.json
README.md
```

Each scenario is a Node.js file that can be run by API Copilot.
They must end with `.scenario.js`.

Your `package.json` should include `api-copilot` as a development dependency.
Install it with `npm install --save-dev api-copilot`.

### API Scenarios

The first thing you should do in a scenario file is require `api-copilot` and create a `Scenario` object:

```js
var copilot = require('api-copilot');

var scenario = new spawner.Scenario({
  name: 'My Demo Sample Data'
});
```

A scenario is basically a sequence of steps that you define using the `step` method:

```js
scenario.step('create some data', function() {
  return 'some data';
});

scenario.step('log the data', function(data) {
  console.log(data);
});
```

Steps are executed in the order they are defined by default.
See [Flow Control](#flowcontrol) for more advanced behavior.

At the end of the file, you should run the scenario with the `run` method:

```js
scenario.run();
```

### Flow Control

<a name="step-complete"></a>
To **complete a step** and send a result to the next step, you can simply return the result if your step is synchronous:

```js
scenario.step('compute data', function() {
  return computeSomeDataSynchronously();
});

scenario.step('log data', function(data) {
  console.log(data);
});
```

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
To make a **asynchronous step**,
return a [promise](http://promises-aplus.github.io/promises-spec/) instead of a value (see [q](https://github.com/kriskowal/q)).
You can generate a deferred object with the `defer` method. Return this object, then resolve or reject it once your asynchronous operation is complete.

```js
scenario.step('async step', function() {

  var deferred = this.defer();

  asyncStuff('input', function(err, result) {
    if (err) {
      deferred.reject(err);
    } else {
      deferred.resolve(result);
    }
  });

  return deferred.promise;
});
```

You can simplify callback-based asynchronous code by requiring [q](https://github.com/kriskowal/q) and using its Node adaptation functions:

```js
var q = require('q');

scenario.step('async step', function() {
  return q.nfcall(asyncStuff, 'input');
});
```

### HTTP Calls

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

### Command Line

The `api-copilot` command is provided by the separate [api-copilot-cli](https://github.com/lotaris/api-copilot-cli) package.
Install it with `npm install -g api-copilot-cli`.

Running `api-copilot` in your project will list available API scenarios and ask you which one you want to run.
If there is only one scenario, it will be run automatically.

## Contributing

* [Fork](https://help.github.com/articles/fork-a-repo)
* Create a topic branch - `git checkout -b feature`
* Push to your branch - `git push origin feature`
* Create a [pull request](http://help.github.com/pull-requests/) from your branch

Please add a changelog entry with your name for new features and bug fixes.

## License

API Copilot is licensed under the [MIT License](http://opensource.org/licenses/MIT).
See [LICENSE.txt](LICENSE.txt) for the full text.
