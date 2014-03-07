import {DirectiveClass, ArrayOfDirectiveClass} from './directive_class';
import {ElementBinder, TextBinder} from './element_binder';

export class BinderBuilder{
  constructor(){
    this.directives = [];
    this.onEvents = [];
    this.bindAttrs = [];
    this.attrs = [];
  }

  addDirectiveClasses(directiveClasses:ArrayOfDirectiveClass, value){
    for(var i = 0, length = directiveClasses.length; i < length; i++){
      this.addDirectiveClass(directiveClasses[i], value);
    }
  }

  addDirectiveClass(directiveClass:DirectiveClass, value){
    this.directives.push(directiveClass);
  }

  buildForElement(){
    return new ElementBinder(this);
  }

  buildForText(){
    return new TextBinder(this);
  }
}
