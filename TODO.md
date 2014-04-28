* BUG: sample scenario a seems to start with step number 2
* IMPORTANT: add link to request & q documentation & CHANGELOG && --help option in documentation section of readme
* IMPORTANT: add documentation links to YAML doc
* allow to set custom error message for expected response values
* allow to configure runtime params (must be a flag or not, description, etc)
* add shared store object and document using global variables
* show scenario configuration at runtime with trace log level (including config before/after config file)
* make run the default action, display --help if no scenario available
* get rid of new Dependency
* check TODO/FIXMEs
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
