* add -p in info output before params
* remove parameter usage notice after validation error and add one info command usage notice above validation error list
* allow configuration from environment variables
* allow configuration from centralized (home) config file
* add method to obfuscate request body/response properties
* add command line option to disable obfuscation
* get rid of new Dependency
* add sample with server and use as readme example
* make scenario name optional (replace with camelcased file name?)
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
* keep asking for scenario identifier if user doesn't give one
* document that extendDefaultRequestOptions has same behavior as Underscore#extend
* show defaults in info effective configuration
