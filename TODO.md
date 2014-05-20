* add sample with server and use as readme example
* make scenario name optional (replace with camelcased file name?)
* run request filters before passing options to client
* expose and document logger
* add scenario file pattern option
* document samples in readme
* show summary when running
* provide underscore and q dependencies
* add shared store object and document using global variables
* make run the default action, display --help if no scenario available
* only show effective configuration in debug mode (indicate that higher log level == more info)
* check TODO/FIXMEs
* display execution time in human-friendly format (2m 30s 123ms)
* allow JSON configuration files
* isolate program functionality from cli functionality (program should handle option overriding/basic parsing, cli should handle command line arguments)
* show scenario configuration at runtime with trace log level (including config before/after config file)
* output pretty errors for invalid scenario files and such
* make `list` check which files export valid scenarios
* get rid of new Dependency
* add method to obfuscate request body/response properties
* add command line option to disable obfuscation
* add min/max configuration for repeated parameters
* do not show source directory in info sub-command output (do not give this option to the scenario when running or showing info)
* refactor client to avoid bind calls (create request wrapper?)
* handle step timeout (with configurable timeout)
* set maximum number of steps to execute? detect loops?
* create step class to hide scenario from step definitions
* add --no-color option
* add --non-interactive option
* keep asking for scenario identifier if user doesn't give one
* document that extendDefaultRequestOptions has same behavior as Underscore#extend
* show defaults in info effective configuration
* spec running a scenario multiple times
* spec utils
* allow to set environment variable prefix
