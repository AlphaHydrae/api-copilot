module.exports = function(grunt) {

  // Project configuration.
  grunt.initConfig({

    pkg: grunt.file.readJSON('package.json'),

    jshint: {
      all: [ 'index.js', 'lib/**/*.js', 'spec/**/*.js' ]
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
    },

    docker: {
      options: {
        inDir: 'lib',
        colourScheme: 'native'
      },
      doc: {
        src: [ 'lib' ],
        dest: 'doc/annotated'
      },
      ghp: {
        src: [ 'lib' ],
        dest: 'tmp/gh-pages/annotated'
      }
    },

    'gh-pages': {
      options: {
        base: 'tmp/gh-pages',
        add: true,
        message: 'Updated annotated source'
      },
      all: {
        src: '**'
      }
    },

    clean: {
      doc: [ 'doc' ],
      ghp: [ 'tmp/gh-pages' ]
    }
  });

  grunt.loadNpmTasks('grunt-bump');
  grunt.loadNpmTasks('grunt-docker');
  grunt.loadNpmTasks('grunt-jasmine-node');
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-gh-pages');
  grunt.loadNpmTasks('grunt-contrib-clean');

  grunt.registerTask('default', [ 'jshint', 'jasmine_node' ]);
  grunt.registerTask('doc', [ 'clean:doc', 'docker:doc' ]);
  grunt.registerTask('publish-doc', [ 'clean:ghp', 'docker:ghp', 'gh-pages' ]);
};
