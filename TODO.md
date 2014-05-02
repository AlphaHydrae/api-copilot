* allow to set custom error message for expected response values
* add auto-completer for selector
* add some colors to listing
* add q.all parallel requests example
* provide underscore and q dependencies
* use <> instead of [] notation for required command line option args in readme
* check TODO/FIXMEs
* rename h.mockMethods to spyObjectMethods
* get rid of new Dependency
* add shared store object and document using global variables
* show scenario configuration at runtime with trace log level (including config before/after config file)
* do not show source directory in info sub-command output (do not give this option to the scenario when running or showing info)
* make run the default action, display --help if no scenario available
* coerge undefined flag value to false, do not allow required in conjunction with flag option
* replace manual injection by electrolyte module
* selector should use finder as dependency
* make scenario name optional
* support multiple configuration files with -c, --config FILE
* make `list` check which files export valid scenarios
* run request filters before passing options to client
* make program and cli function return a promise
* output pretty errors for invalid scenario files and such
* refactor client to avoid bind calls (create request wrapper?)
* expose and document logger
* handle step timeout (with configurable timeout)
* add scenario file pattern option
* set maximum number of steps to execute? detect loops?
* create step class to hide scenario from step definitions
* add --no-color option
* add --non-interactive option
