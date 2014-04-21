[![Build Status](https://travis-ci.org/angular/templating.png?branch=master)](https://travis-ci.org/angular/templating)

# Angular Templating

The templating engine for Angular 2.0.

## Setup

1. Install [NodeJS](http://nodejs.org/)
2. At the command prompt install [Gulp](http://gulpjs.com/) with `npm install -g gulp`
3. From the repo, install dependencies with `npm install`

## Running the Samples

1. At the command prompt, start the development web server with `gulp build watch serve`
2. Open a browser and navigate to [http://localhost:8000/temp/examples/helloworld.html?compile_templates](http://localhost:8000/temp/examples/helloworld.html?compile_templates)

>> **Note:** Without the query string, the sample uses precompiled templates, which you can build with `gulp templates`.

## Development

1. At the command prompt, install the cli for [Karma](http://karma-runner.github.io/) with `npm install -g karma-cli`
2. At the command prompt, start karma with `karma start`
3. Add new tests to the `test` folder. Be sure to give them an extension of `.spec.js`.

### Code Style Guide

* Use 2 spaces as tab, see .editorconfig