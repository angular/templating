import {DirectiveClass, ArrayOfDirectiveClass} from './directive_class';
import {ElementBinder, TextBinder} from './element_binder';

export class BinderBuilder{
  constructor(){
    this.directives = [];
  }

  addDirectiveClasses(directiveClasses:ArrayOfDirectiveClass, value:string){
    for(var i = 0, length = directiveClasses.length; i < length; i++){
      this.addDirective(directiveClasses[i], value);
    }
  }

  addDirectiveClass(directiveClass:DirectiveClass, value:string){
    this.directives.push(directiveClass);
  }

  buildForElement(){
    return new ElementBinder(this);
  }

  buildForText(){
    return new TextBinder(this);
  }
}