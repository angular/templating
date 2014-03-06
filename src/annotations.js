export class Directive {
  constructor({selector}){
    this.selector = selector;
  }
}

export class DecoratorDirective extends Directive {

}

export class TemplateDirective extends Directive {

}

export class ComponentDirective extends Directive {

}
