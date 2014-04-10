* add request option to check expected status code
* allow skip message to be null or false
* make client#request errors more consistent (currently sometimes exceptions are thrown, sometimes a rejected promise is returned)
* add method to complete scenario
* expose and document logger
* handle step timeout (with configurable timeout)
* set maximum number of steps to execute? detect loops?
* create step class to hide scenario from step definitions (add shared store?)
