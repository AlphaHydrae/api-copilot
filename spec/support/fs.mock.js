var _ = require('underscore');

function FileSystem() {
  this.files = {};
}

_.extend(FileSystem.prototype, {

  reset: function() {
    this.files = {};
  },

  existsSync: function(file) {
    return !!this.files[file];
  },

  readFileSync: function(file) {
    if (!this.files[file]) {
      throw new Error('No such file ' + file);
    }

    return this.files[file];
  }
});

module.exports = new FileSystem();
