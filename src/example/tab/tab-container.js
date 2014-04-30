import {Inject} from 'di';
import {ComponentDirective, InjectQuery} from 'templating';

@ComponentDirective({
  selector: 'tab-container',
  observe: {
    'tabs[]': 'tabsChanged'
  },
  shadowDOM: true
})
export class TabContainer {
  constructor(@InjectQuery('tabpane') tabs) {
    // TODO: This is needed as ngRepeat creates a child object as execution context.
    // when an expression in that child object is evaluated we
    // get that child object as current "this", and not our original "this"
    this.select = this.select.bind(this);
    this.tabs = tabs;
  }
  selectFirstTab() {
    if (!this.tabs) {
      return;
    }
    var oneSelected = false;
    var tabs = this.tabs;
    tabs.forEach((tab) => {
      oneSelected = oneSelected || tab.selected;
    })
    if (!oneSelected && tabs.length) {
      this.select(tabs[0]);
    }
  }
  tabsChanged(tabs) {
    this.selectFirstTab();
  }
  select(tab) {
    if (this.selectedTab) {
      this.selectedTab.selected = false;
    }
    this.selectedTab = tab;
    tab.selected = true;
  }
  selectNext() {
    var tabs = this.tabs;
    var index = tabs.indexOf(this.selectedTab);
    var nextIndex = index+1;
    if (nextIndex >= tabs.length) {
      nextIndex = 0;
    }
    this.select(tabs[nextIndex]);
  }
}
