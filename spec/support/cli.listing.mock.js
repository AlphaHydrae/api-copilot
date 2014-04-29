var _ = require('underscore'),
    h = require('./helpers');

var instances = [];

function ListingMock() {
  this.args = Array.prototype.slice.call(arguments);
  h.mockMethods(this, 'display');
  instances.push(this);
}

_.extend(ListingMock.prototype, {

  display: function() {
  }
});

module.exports = ListingMock;
module.exports.instances = instances;
