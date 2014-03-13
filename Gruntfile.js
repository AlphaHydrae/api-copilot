module.exports = function(grunt) {

  // Project configuration.
  grunt.initConfig({

    pkg: grunt.file.readJSON('package.json'),

    jshint: {
      all: [ 'index.js', 'lib/**/*.js' ]
    },

    jasmine_node: {
      options: {
        forceExit: true,
        match: '.',
        matchall: false,
        extensions: 'js',
        specNameMatcher: 'spec'
      },
      all: [ 'spec/' ]
    }
  });

  grunt.loadNpmTasks('grunt-bump');
  grunt.loadNpmTasks('grunt-jasmine-node');
  grunt.loadNpmTasks('grunt-contrib-jshint');

  grunt.registerTask('default', [ 'jshint', 'jasmine_node' ]);
};
