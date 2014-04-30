import {Queryable, AttachAware} from 'templating';
import {TabContainer} from './tab-container';

@Queryable('tabpane')
@AttachAware
export class TabPane {
  constructor() {
    this.selected = false;
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
