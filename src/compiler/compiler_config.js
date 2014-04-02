import {DirectiveClass, ArrayOfDirectiveClass} from './directive_class';
import {Directive} from '../annotations';
import {ArrayOfClass} from '../types';
import {AnnotationProvider} from '../annotation_provider';

export class CompilerConfig {
  constructor(annotationProvider:AnnotationProvider = new AnnotationProvider()) {
    this.interpolationRegex = /{{(.*?)}}/g;
    this.bindAttrRegex = /bind-(.+)/;
    this.eventAttrRegex = /on-(.+)/;
    this.annotationProvider = annotationProvider;
  }
  directiveClassesForDirectives(directives:ArrayOfClass):ArrayOfDirectiveClass {
    var directiveClasses = [];
    var self = this;
    directives.forEach(function(directive) {
      var annotation = self.annotationProvider.annotation(directive, Directive);
      if (annotation) {
        directiveClasses.push(new DirectiveClass(annotation, directive));        
      }
    });
    return directiveClasses;
  }
}
