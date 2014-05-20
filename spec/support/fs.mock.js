var _ = require('underscore');

function FileSystem() {
  this.reset();
}

_.extend(FileSystem.prototype, {

  reset: function() {
    this.files = {};
  },

  exists: function(file, callback) {
    callback(undefined, !!this.files[file]);
  },

  existsSync: function(file) {
    return !!this.files[file];
  },

  readFile: function(file, options, callback) {
    if (callback === undefined) {
      callback = options;
    }

    if (!this.files[file]) {
      return callback(new Error('No such file ' + file));
    }

    callback(undefined, this.files[file]);
  },

  readFileSync: function(file) {
    if (!this.files[file]) {
      throw new Error('No such file ' + file);
    }

    return this.files[file];
  }
});

module.exports = new FileSystem();
