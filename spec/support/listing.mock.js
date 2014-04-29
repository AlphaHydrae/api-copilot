var _ = require('underscore'),
    path = require('path');

function ListingMock() {

  this.scenarios = [];

  _.each([ 'find', 'display' ], function(method) {
    spyOn(this, method).andCallThrough();
  }, this);
}

_.extend(ListingMock.prototype, {

  find: function() {
    return this.scenarios;
  },

  display: function() {
  },

  setFiles: function(files) {
    this.scenarios = _.map(files, function(file) {
      return {
        file: file,
        name: path.basename(file).replace(/\.scenario\.js$/, '')
      };
    });
  }
});

module.exports = ListingMock;
