import {Inject} from 'di';
import {InjectQuery} from 'templating';

export class TabContainer {
  constructor(@InjectQuery('tabpane') tabs) {
    this.tabs = tabs;
  }
  selectFirstTab() {
    var oneSelected = false;
    var tabs = this.tabs;
    tabs.forEach((tab) => {
      oneSelected = oneSelected || tab.selected;
    })
    if (!oneSelected && tabs.length) {
      this.select(tabs[0]);
    }
  }
  tabsChanged() {
    this.selectFirstTab();
  }
  polymerSelect(e, detail, sender) {
    this.select(e.target.templateInstance.model.row);
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
TabContainer.prototype.observe = {
  'tabs.changeCounter': 'tabsChanged'
};