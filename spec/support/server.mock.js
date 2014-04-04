var express = require('express'),
    quip = require('quip'),
    app = express();

app.use(express.bodyParser());

app.get('/', function(req, res) {
  quip(res).text("Hello World!");
}); 

app.delete('/', function(req, res) {
  res.send(204);
});

app.post('/json', function(req, res) {
  quip(res).json(req.body);
});

var port = process.env.API_COPILOT_TEST_PORT || 3210;

if (!process.send) {
  process.send = function() {};
}

try {
  app.listen(port, function() {
    process.send({ port: port });
  });
} catch (e) {
  process.send({ error: e });
}
