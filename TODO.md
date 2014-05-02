* rename h.mockMethods to spyObjectMethods
* get rid of new Dependency
* replace manual injection by electrolyte module
* allow to set parameter default value
* allow to coerce parameter values with custom function
* add sample with server and use as readme example
* make scenario name optional (replace with camelcased file name?)
* coerge undefined flag value to false, do not allow required in conjunction with flag option
* selector should use finder as dependency
* support multiple configuration files with -c, --config FILE
* make `list` check which files export valid scenarios
* run request filters before passing options to client
* output pretty errors for invalid scenario files and such
* expose and document logger
* add scenario file pattern option
* document samples in readme
* show summary when running
* provide underscore and q dependencies
* add shared store object and document using global variables
* show scenario configuration at runtime with trace log level (including config before/after config file)
* check TODO/FIXMEs
* do not show source directory in info sub-command output (do not give this option to the scenario when running or showing info)
* make run the default action, display --help if no scenario available
* refactor client to avoid bind calls (create request wrapper?)
* handle step timeout (with configurable timeout)
* set maximum number of steps to execute? detect loops?
* create step class to hide scenario from step definitions
* add --no-color option
* add --non-interactive option
