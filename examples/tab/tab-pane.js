import {Provide} from 'di';
import {ComponentDirective} from 'templating';

@ComponentDirective({
  selector: 'tab-pane',
  bind: {
    'selected': 'selected',
    'title': 'title'
  },
  shadowDOM: true
})
export class TabPane {
  constructor() {
    this.selected = false;
  }
}
