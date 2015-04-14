var cp = require('child_process'),
    h = require('./support/helpers'),
    ioc = require('../lib/ioc'),
    path = require('path'),
    slice = Array.prototype.slice;

var Scenario = ioc.create('scenario');

describe("Mock Server Scenario", function() {

  var server, scenario;
  beforeEach(function() {
    scenario = new Scenario({ name: 'once upon a time' });
  });

  afterEach(function() {
    if (server) {
      server.stop();
    }
  });

  it("should work", function() {

    scenario.step('GET /', function() {
      return this.get({ url: server.url('/') });
    });

    scenario.step('check plain text response', function(response) {
      expect(response.statusCode).toBe(200);
      expect(response.headers['content-type']).toMatch(/^text\/plain(?:\;|$)/);
      expect(response.body).toBe('Hello World!');
      return this.success(response.statusCode, response.body);
    });

    scenario.step('DELETE /', function(statusCode, body) {
      expect(statusCode).toBe(200);
      expect(body).toBe('Hello World!');
      return this.delete({ url: server.url('/') });
    });

    scenario.step('check no content response', function(response) {
      expect(response.body).toBe('');
      expect(response.statusCode).toBe(204);
    });

    scenario.step('POST /json', function() {
      return this.post({
        url: server.url('/json'),
        json: true,
        body: {
          foo: 'bar'
        }
      });
    });

    scenario.step('check JSON response', function(response) {
      expect(response.statusCode).toBe(200);
      expect(response.body).toEqual({ foo: 'bar' });
    });

    scenario.step('POST /json with invalid JSON', function() {
      return this.post({
        url: server.url('/json'),
        body: 'foo',
        headers: {
          'Content-Type': 'application/json'
        }
      });
    });

    scenario.step('check bad request response', function(response) {
      expect(response.statusCode).toBe(400);
    });

    server = h.startMockServer();
    h.runScenario(scenario, true, { timeout: 500 });
  });
});
