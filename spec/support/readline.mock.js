var _ = require('underscore'),
    h = require('./helpers');

function ReadlineInterfaceMock(answers) {
  this.answers = answers;
  h.mockMethods(this, 'question', 'close');
}

_.extend(ReadlineInterfaceMock.prototype, {

  question: function(query, callback) {
    if (!this.answers.length) {
      throw new Error('No answer mocked in readline interface');
    }

    callback(this.answers.shift());
  },

  close: function() {}
});

function ReadlineMock() {
  this.answers = [];
  this.interfaces = [];
  h.mockMethods(this, 'createInterface');
}

_.extend(ReadlineMock.prototype, {

  createInterface: function() {

    var rl = new ReadlineInterfaceMock(this.answers);
    this.interfaces.push(rl);

    return rl;
  },

  getLatestInterface: function() {
    return _.last(this.interfaces);
  },

  addAnswer: function(answer) {
    this.answers.push(answer);
  }
});

module.exports = ReadlineMock;
