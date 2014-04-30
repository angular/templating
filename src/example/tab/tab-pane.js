import {ComponentDirective, Queryable, AttachAware} from 'templating';
import {TabContainer} from './tab-container';
import {Injector} from 'di';

@ComponentDirective({
  selector: 'tab-pane',
  shadowDOM: true
})
@Queryable('tabpane')
@AttachAware
export class TabPane {
  constructor(node:Node) {
    this.selected = false;
    this.node = node;
  }
  diAttached(container:TabContainer) {
    this.container = container;
    console.log('tab '+this.title+' attached to container',container);
  }
  diDetached() {
    console.log('tab '+this.title+' detached');
  }
  next() {
    this.container.selectNext();
  }
}
