import {DirectiveClass, ArrayOfDirectiveClass} from './directive_class';
import {Directive} from './annotations';
import {ArrayOfClass} from './types';

export class CompilerConfig {
  constructor() {
    this.interpolationRegex = /{{(.*?)}}/g;
    this.bindAttrRegex = /bind-(.+)/;
    this.eventAttrRegex = /on-(.+)/;
  }
  directiveClassesForDirectives(directives:ArrayOfClass):ArrayOfDirectiveClass {
    var directiveClasses = [];
    directives.forEach(function(directive) {
      var annotations = directive.annotations || [];
      annotations.filter(function(annotation) {
        return annotation instanceof Directive;
      }).forEach(function(directiveAnnotation) {
        directiveClasses.push(new DirectiveClass(directiveAnnotation, directive));
      });      
    });
    return directiveClasses;
  }
}
