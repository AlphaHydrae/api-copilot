* allow to customize param loading so that they may also be taken from an additional source yet remain mandatory
* add summary option to scenario to display in info output and when running
* allow to set custom error message for expected response values
* add shared store object and document using global variables
* show scenario configuration at runtime with trace log level (including config before/after config file)
* add info sub-command information about modifying configuration file and command line options
* do not show source directory in info sub-command output (do not give this option to the scenario when running or showing info)
* make run the default action, display --help if no scenario available
* add auto-completer for selector
* add some colors to listing
* show loaded configuration file path in info sub-command
* get rid of new Dependency
* add q.all parallel requests example
* provide underscore and q dependencies
* rename h.mockMethods to spyObjectMethods
* use <> instead of [] notation for required command line option args in readme
* check TODO/FIXMEs
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
