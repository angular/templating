[![Build Status](https://travis-ci.org/angular/templating.png?branch=master)](https://travis-ci.org/angular/templating)

# Angular Templating

The templating engine for Angular 2.0.

## Setup

1. `npm install`
1. `npm install -g gulp`
1. `npm install -g bower`
1. `npm install -g protractor`
1. `bower install`

## Running the examples

1. `gulp build watch serve`
2. Go to [http://localhost:8000/dist/amd/example/index.html](http://localhost:8000/dist/amd/example/index.html)

## Unit tests

1. Unit tests: `karma start`

## E2e tests

1. Start the server: `gulp build watch serve`
1. Start and download webdriver: `webdriver-manager start`
1. Run the tests: `protractor`

### Code Style Guide

* Use 2 spaces as tab, see .editorconfig