import {DecoratorDirective, DomMovedAware} from 'templating';

@DecoratorDirective({
  selector: '[todo-width]'
})
@DomMovedAware
export class TodoWidth {
  constructor(element:Node) {
    this.element = element;
  }
  domMoved() {
    console.log(this.element.textContent.trim()+'['+this.element.offsetWidth+':'+this.element.offsetHeight+']');
  }
}
