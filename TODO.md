* BUG: sample scenario a seems to start with step number 2
* IMPORTANT: add link to request & q documentation & CHANGELOG in documentation section of readme
* allow to configure runtime params (must be a flag or not, description, etc)
* support multiple configuration files with -c, --config FILE
* run request filters before passing options to client
* make program and cli function return a promise
* output pretty errors for invalid scenario files and such
* refactor client to avoid bind calls (create request wrapper?)
* expose and document logger
* handle step timeout (with configurable timeout)
* add scenario file pattern option
* set maximum number of steps to execute? detect loops?
* create step class to hide scenario from step definitions (add shared store?)
* add --no-color option
