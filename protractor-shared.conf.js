require('./node_modules/traceur/bin/traceur-runtime.js');

exports.config = {
  baseUrl: 'http://localhost:8000/dist/amd/example/',
  framework: 'jasmine',

  specs: [
    'dist/amd/test/example/**/*.spec.js',
  ],

  onPrepare: function() {
    // Disable waiting for Angular as we don't have an integration layer yet...
    // TODO: Implement a proper debugging API for ng2.0, remove this here
    // and the sleeps in all tests.
    browser.ignoreSynchronization = true;
    global.SLEEP_INTERVAL = process.env.TRAVIS ? 5000 : 200;
  },

  jasmineNodeOpts: {
    showColors: false,
    includeStackTrace: true,
    isVerbose: false
  }
};