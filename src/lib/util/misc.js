import {Provide} from 'di';

export function valueProvider(token, value) {
  @Provide(token)
  function provider() {
    return value;
  }
  return provider;
}

export function getAnnotation(clazz:Function, annotationType:Function) {
  var annotations = clazz.annotations || [];
  var res;
  annotations.forEach(function(annotation) {
    if (annotation instanceof annotationType) {
      res = annotation;
    }
  });
  return res;
}
