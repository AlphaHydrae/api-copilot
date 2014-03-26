# Changelog

## v0.1.3 - March 26, 2014

* **NEW:** Scenario options can be given through an `api-copilot.yml` file in the current working directory:

  * the `-c, --config [file]` command line option sets another path for this configuration file.

* The `run` method of scenario objects returns a promise.

* Process exits with status 2 if the scenario fails.

## v0.1.2 - March 21, 2014

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

## v0.1.1 - March 21, 2014

* **BREAKING!** Scenario files must export the Scenario object instead of running it.

## v0.1.0 - March 20, 2014

* Proof of concept.
