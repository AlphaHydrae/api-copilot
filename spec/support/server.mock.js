var bodyParser = require('body-parser'),
    express = require('express'),
    http = require('http'),
    path = require('path');

var router = express.Router();

router.get('/', function(req, res) {
  res.type('text/plain').send('Hello World!');
});

router.delete('/', function(req, res) {
  res.status(204).send(null);
});

router.post('/json', function(req, res) {
  res.type('text/plain').send(req.body);
});

var app = express();
app.use(bodyParser.json());
app.use('/', router);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handlers
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.send(err.message);
});

var port = process.env.API_COPILOT_TEST_PORT || 3210;
app.set('port', port);

if (!process.send) {
  process.send = function() {};
}

var server = http.createServer(app);
server.listen(port);
server.on('error', onError);
server.on('listening', onListening);

// Event listener for HTTP server "error" event.
function onError(error) {
  if (error.syscall !== 'listen') {
    throw error;
  }

  var bind = 'Port ' + port;

  // handle specific listen errors with friendly messages
  switch (error.code) {
    case 'EACCES':
      console.error(bind + ' requires elevated privileges');
      break;
    case 'EADDRINUSE':
      console.error(bind + ' is already in use');
      break;
  }

  process.send({ error: error });
}

// Event listener for HTTP server "listening" event.
function onListening() {
  var addr = server.address();
  process.send({ port: addr.port });
}
