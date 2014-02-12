module.exports = function(grunt) {
  var amdclean = require('amdclean'),
    fs = require('fs'),
    amdclean_logic = function (data) {
      var outputFile = data.path;
      fs.writeFileSync(outputFile, amdclean.clean({
        'code': fs.readFileSync(outputFile),
        'globalObject': true,
        'globalObjectName': 'amdclean_website',
        'rememberGlobalObject': false
      }));
    };
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    requirejs: {
      mobileJS: {
        options: {
          baseUrl: './js/app',
          paths: {
            'mobile': 'init/MobileInit'
          },
          wrap: true,
          optimize: 'none',
          mainConfigFile: './js/app/config/config.js',
          useStrict: true,
          include: ['mobile'],
          out: './js/app/init/MobileInit.min.js',
          onModuleBundleComplete: amdclean_logic
        }
      },
      mobileCSS: {
        options: {
          optimizeCss: 'standard',
          cssIn: 'css/app/mobile.css',
          out: 'css/app/mobile.min.css'
        }
      },
      desktopJS: {
        options: {
          baseUrl: './js/app',
          paths: {
            'desktop': 'init/DesktopInit'
          },
          wrap: true,
          optimize: 'none',
          mainConfigFile: './js/app/config/config.js',
          useStrict: true,
          include: ['desktop'],
          out: './js/app/init/DesktopInit.min.js',
          onModuleBundleComplete: amdclean_logic
        }
      },
      desktopCSS: {
        options: {
          optimizeCss: 'standard',
          cssIn: 'css/app/desktop.css',
          out: 'css/app/desktop.min.css'
        }
      }
    },
    jshint: {
      files: ['Gruntfile.js', './js/app/**/*.js', '!./js/app/**/*min.js'],
      options: {
        globals: {
          jQuery: true,
          console: false,
          module: true,
          document: true
        }
      }
    }
  });
  grunt.loadNpmTasks('grunt-contrib-requirejs');
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.registerTask('test', ['jshint']);
  grunt.registerTask('build', ['requirejs:desktopJS', 'requirejs:mobileJS', 'requirejs:desktopCSS', 'requirejs:mobileCSS']);
  grunt.registerTask('default', ['test', 'build']);
};
