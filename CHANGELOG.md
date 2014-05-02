# Changelog

## v0.5.0 - May 2, 2014 - [commits](https://github.com/lotaris/api-copilot/compare/0.4.0...0.5.0)

* **BREAKING!** [Runtime parameters](README.md#runtime-parameters) have been completely overhauled.

* **NEW:** The [listing](README.md#listing) sub-command lists available API scenarios in your project.

* **NEW:** The [info](README.md#info) sub-command prints detailed information about an API scenario.
  You can also add your own documentation by listening to the [scenario:info event](README.md#documenting).

  Also check out:
  
    * [the summary option](README.md#summary-option),

    * [documenting parameters](README.md#documenting-parameters).

* The [run](README.md#running) and the [info](README.md#info) commands support auto-completion of scenario names when prompting to select a scenario.

* [Custom error messages](README.md#request-expect-custom-message) can now be specified when expecting an HTTP response to have a certain value.

* HTTP requests can be run in parallel by passing them to the [all method](README.md#request-parallel).

* *BUGFIX:* steps were numbered starting from 2 in the command line output.

## v0.4.0 - April 24, 2014 - [commits](https://github.com/lotaris/api-copilot/compare/0.3.3...0.4.0)

* **BREAKING!** Request options are now merged with default request options instead of overriding them.
  For example, if there are headers in both the default request options and the request options, they will be
  merged instead of only the latter being used.

* **NEW:** An [expected status code](README.md#request-expect) can now be specified when making HTTP requests.

* **NEW:** The scenario can be completed before reaching the final step with the new [complete method](README.md#scenario-complete).

* Additional request options can be [merged without overriding other options](README.md#defaultRequestOptions-merge) with the [deepmerge](https://github.com/nrf110/deepmerge) library.

* Allow custom error message for required parameters. See [runtime parameters](README.md#runtime-parameters).

* *BUGFIX:* setting a base URL and providing no URL when making an HTTP request would cause an undefined string to be appended to the constructed URL.

* *BUGFIX:* skipping a step did not work with a falsy message.

## v0.3.3 - April 16, 2014 - [commits](https://github.com/lotaris/api-copilot/compare/0.3.2...0.3.3)

* *BUGFIX:* undefined strings were logged due to missing colors dependency.

## v0.3.2 - April 15, 2014 - [commits](https://github.com/lotaris/api-copilot/compare/0.3.1...0.3.2)

* Experimental run command (undocumented).

## v0.3.1 - April 9, 2014 - [commits](https://github.com/lotaris/api-copilot/compare/0.3.0...0.3.1)

* Required request options (`method` and `url`) are now validated after request filters are run.
  This allows the method or URL to be set by filters.

## v0.3.0 - April 9, 2014 - [commits](https://github.com/lotaris/api-copilot/compare/0.2.1...0.3.0)

* **NEW:** Scenarios can be [customized with runtime parameters](README.md#runtime-parameters):

  * the `-p, --params [name|name=value]` command line option sets a custom parameter;

  * the `param` method of a scenario retrieves these parameters.

* **NEW:** [multipart/form-data requests](README.md#multipart-form-data) are now supported.

* *BUGFIX:* all steps were printed as step number 1.

## v0.2.1 - April 3, 2014 - [commits](https://github.com/lotaris/api-copilot/compare/0.2.0...0.2.1)

* **NEW:** Configuration options can be changed at runtime with the `configure` method.

* The new `showFullUrl` option causes full URLs to be displayed instead of paths only when a base URL is configured.

## v0.2.0 - March 31, 2014 - [commits](https://github.com/lotaris/api-copilot/compare/0.1.4...0.2.0)

* **BREAKING!** Request filters must now return the request options object instead of modifying it by reference.

* **NEW:** When an error occurs, set the log level to `trace` to see the stack trace.

* Request filters can be made asynchronous by returning a promise for the request options.

## v0.1.4 - March 26, 2014 - [commits](https://github.com/lotaris/api-copilot/compare/0.1.3...0.1.4)

* Fixed the scenario completion message.

* *BUGFIX:* request filters did not receive the request options as first argument.

## v0.1.3 - March 26, 2014 - [commits](https://github.com/lotaris/api-copilot/compare/0.1.2...0.1.3)

* **NEW:** Scenario options can be given through an `api-copilot.yml` file in the current working directory:

  * the `-c, --config [file]` command line option sets another path for this configuration file.

* The `run` method of scenario objects returns a promise.

* Process exits with status 2 if the scenario fails.

* *BUGFIX:* `success` would only forward its first argument to the next step.

## v0.1.2 - March 21, 2014 - [commits](https://github.com/lotaris/api-copilot/compare/0.1.1...0.1.2)

* **BREAKING!** Request filters are no longer passed a store object.

* **NEW:** Scenario options:

  * `log` sets the log level ("trace", "debug" or "info"; "info" by default);
  * `showTime` prints the date and time with each logs;
  * `showRequest` prints the options of each HTTP request (if the log level is debug or trace);
  * `showResponseBody` prints the body of each HTTP response (if the log level is debug or trace).

* **NEW:** Command line options:

  * `-l, --log [level]` sets the log level (trace, debug or info; info by default);
  * `-u, --base-url [url]` overrides the base URL of the scenario;
  * `-t, --show-time` prints the date and time with each logs;
  * `-q, --show-request` prints the options of each HTTP request (if the log level is debug or trace);
  * `-b, --show-response-body` prints the body of each HTTP response (if the log level is debug or trace).

* The body of HTTP responses is now hidden by default. Use the new `showResponseBody` scenario option or the `-b, --show-response-body` command line option to print it.

## v0.1.1 - March 21, 2014 - [commits](https://github.com/lotaris/api-copilot/compare/0.1.0...0.1.1)

* **BREAKING!** Scenario files must export the Scenario object instead of running it.

## v0.1.0 - March 20, 2014

* Proof of concept.
