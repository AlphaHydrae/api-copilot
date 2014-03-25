var _ = require('underscore');

function ClientMock(options) {
  this.options = options;
  spyOn(this, 'configure');
}

_.extend(ClientMock.prototype, {

  configure: function(options) {
  }
});

module.exports = ClientMock;
