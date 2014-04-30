var _ = require('underscore'),
    path = require('path');

exports.parseFiles = function(files) {
  return _.map(files, function(file) {
    return {
      file: file,
      name: path.basename(file).replace(/\.scenario\.js$/, '')
    };
  });
};
