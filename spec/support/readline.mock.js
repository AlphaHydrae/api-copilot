var _ = require('underscore');

function ReadlineMock() {

  this.interfaces = [];

  _.each([ 'createInterface' ], function(method) {
    spyOn(this, method).andCallThrough();
  }, this);
}

_.extend(ReadlineMock.prototype, {

  createInterface: function() {
  }
});

module.exports = ReadlineMock;
