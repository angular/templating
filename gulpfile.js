var gulp = require('gulp');
var pipe = require('pipe/gulp');
var connect = require('gulp-connect');


var path = {
  src: ['./src/**/*.js'],
  examples: ['./examples/**/*.js']
};


// TRANSPILE ES6
gulp.task('build_source_amd', function() {
  gulp.src(path.src)
      .pipe(pipe.traceur())
      .pipe(gulp.dest('dist/amd'));
  gulp.src(path.examples)
      .pipe(pipe.traceur())
      .pipe(gulp.dest('temp/examples'));
});

gulp.task('build', ['build_source_amd']);


// WATCH FILES FOR CHANGES
gulp.task('watch', function() {
  gulp.watch([path.src, path.examples], ['build']);
});


// WEB SERVER
gulp.task('serve', connect.server({
  root: [__dirname],
  port: 8000,
  open: {
    browser: 'Google Chrome'
  }
}));
