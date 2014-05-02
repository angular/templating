import {Provide} from 'di';
import {ComponentDirective} from 'templating';

@ComponentDirective({
  selector: 'tab-container',
  observe: {
    'tabs': 'tabsChanged'
  },
  shadowDOM: true,
  query: {
    'tab-pane': 'tabs'
  }
})
export class TabContainer {
  constructor() {
    // TODO: This is needed as ngRepeat creates a child object as execution context.
    // when an expression in that child object is evaluated we
    // get that child object as current "this", and not our original "this"
    this.select = this.select.bind(this);
  }
  tabsChanged(tabs) {
    // select the first tab
    this.tabs = tabs;
    var oneSelected = false;
    tabs.forEach((tab) => {
      oneSelected = oneSelected || tab.selected;
    })
    if (!oneSelected && tabs.length) {
      this.select(tabs[0]);
    }
  }
  select(tab) {
    if (this.selectedTab) {
      this.selectedTab.selected = false;
    }
    this.selectedTab = tab;
    tab.selected = true;
  }
}
