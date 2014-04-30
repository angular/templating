var sharedConfig = require('pipe/karma');

module.exports = function(config) {
  sharedConfig(config);

  config.set({
    // list of files / patterns to load in the browser
    files: [
      'node_modules/traceur/bin/traceur.js',
      'test/unit-test-main.js',

      {pattern: 'src/lib/**/*.js', included: false},
      {pattern: 'test/lib/**/*', included: false},

      {pattern: 'node_modules/di/src/**/*.js', included: false},
      {pattern: 'node_modules/rtts-assert/src/**/*.js', included: false},
      {pattern: 'node_modules/watchtower/src/**/*.js', included: false},
      {pattern: 'node_modules/expressionist/src/**/*.js', included: false},
      {pattern: 'node_modules/es6-shim/es6-shim.js', included: false}
    ],
    preprocessors: {
      'src/lib/**/*.js': ['traceur'],
      'test/lib/**/*.js': ['traceur'],
      'node_modules/di/src/**/*.js': ['traceur'],
      'node_modules/rtts-assert/src/**/*.js': ['traceur'],
      'node_modules/watchtower/src/**/*.js': ['traceur'],
      'node_modules/expressionist/src/**/*.js': ['traceur']
    }
  });

  config.sauceLabs.testName = 'templating';

  if (process.env.TRAVIS) {
    config.sauceLabs.startConnect = false;
  }
};
