var config = require('./protractor-shared.conf').config;

config.seleniumAddress = 'http://localhost:4444/wd/hub';
config.capabilities = {
  browserName: 'chrome',
};
config.jasmineNodeOpts.defaultTimeoutInterval = 30000;

exports.config = config;