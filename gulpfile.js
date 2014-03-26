var gulp = require('gulp');
var pipe = require('pipe/gulp');
var connect = require('gulp-connect');
var traceur = require('gulp-traceur');
var through = require('through2');


var path = {
  src: ['./src/**/*.js'],
  examples: ['./examples/**/*.js']
};


// TRANSPILE ES6
gulp.task('build_source_amd', function() {
  gulp.src(path.src)
      .pipe(traceur(pipe.traceur()))
      .pipe(gulp.dest('dist/amd'));
});

gulp.task('build_examples', function() {
  gulp.src(path.examples)
      .pipe(traceur(pipe.traceur()))
      .pipe(gulp.dest('temp/examples'));
});

gulp.task('build_source_cjs', function() {
  gulp.src(path.src)
      .pipe(traceur(pipe.traceur({modules: 'commonjs'})))
      .pipe(gulp.dest('dist/cjs'));
});

gulp.task('build', ['build_source_amd', 'build_source_cjs', 'build_examples']);


// WATCH FILES FOR CHANGES
gulp.task('watch', function() {
  gulp.watch([path.src], ['build_source_amd']);
  gulp.watch([path.examples], ['build_examples']);
});


// WEB SERVER
gulp.task('serve', connect.server({
  root: [__dirname],
  port: 8000,
  open: {
    browser: 'Google Chrome'
  }
}));


var clientify = require('clientify');
var rename = function(search, replace) {
  return through.obj(function(file, enc, cb) {
    file.path = file.path.replace(search, replace);
    this.push(file);
  });
};

// Move to package.json?
var GITHUB_REPOS = [
  'angular/watchtower.js#dist',
  'angular/expressionist.js#dist'
];

gulp.task('shrinkwrap', function() {
  gulp.src('./package.json')
    .pipe(through.obj(function(file, _, done) {
      var pkg = JSON.parse(file.contents);
      var stream = this;
      clientify.shrinkwrap(pkg, GITHUB_REPOS).then(function(shrinkwrap) {
        file.contents = new Buffer(JSON.stringify(shrinkwrap, null, '  '));
        stream.push(file);
        done();
      });
    }))
    .pipe(rename('package.json', 'npm-shrinkwrap.json'))
    .pipe(gulp.dest('.'));
});
