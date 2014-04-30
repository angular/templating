var {shadowDomQuery, shadowDomQueryAll} = require('./shadow-dom-util');

describe('ng tab ', function () {
  testTabs('tab/index.html');
});

describe('polymer tab ', function () {
  testTabs('polymertab/index.html');
});

function testTabs(url) {
  beforeEach(function () {
    browser.get(url);
    // TODO: replace this with a proper protractor/ng2.0 integration
    // and remove this function as well as all method calls.
    browser.driver.sleep(SLEEP_INTERVAL);
  });

  it('should show two containers with two tabs each', () => {

    checkTabContainerFunctionality('#container1', ['tab1', 'tab2']);
    checkTabContainerFunctionality('#container2', ['tab11', 'tab12']);

  });

  it('should add a tab pane to the first container and still work', () => {

    $('.tst-add-tab').click();

    checkTabContainerFunctionality('#container1', ['tab1', 'tab2', 'tab100']);

  });

  it('should move a tab pane from the first container to the second and still work', () => {

    $('.tst-add-tab').click();
    $('.tst-move-tab').click();

    checkTabContainerFunctionality('#container1', ['tab2', 'tab100']);
    checkTabContainerFunctionality('#container2', ['tab11', 'tab12', 'tab1']);

  });

  function checkTabContainerFunctionality(tabContainerSelector, expectedTabTitles) {
    var tabContainer = $(tabContainerSelector);
    var tabPanes = $$(tabContainerSelector+' tab-pane');

    expect(getTabTitles(tabContainer)).toEqual(expectedTabTitles);
    // initial tab selection
    checkTabVisibility(tabPanes, 0);
    checkShowTabCycle(tabContainer, tabPanes);
    checkNextTabCycle(tabPanes);
  }


  function checkShowTabCycle(tabContainer, tabPanes) {
    tabPanes.count().then((count) => {
      for (var i=0; i<count; i++) {
        checkTabVisibility(tabPanes, i);
        var nextTabIndex = i+1;
        if (nextTabIndex === count) {
          nextTabIndex = 0;
        }
        shadowDomQuery(tabContainer, 'button', (button) => button.click(), nextTabIndex );
      }
      checkTabVisibility(tabPanes, 0);
    });
  }

  function checkNextTabCycle(tabPanes) {
    tabPanes.count().then((count) => {
      for (var i=0; i<count; i++) {
        checkTabVisibility(tabPanes, i);
        shadowDomQuery(tabPanes.get(i), 'button', (button) => button.click() );
      }
      checkTabVisibility(tabPanes, 0);
    });
  }

  function checkTabVisibility(tabPanes, selectedIndex) {
    tabPanes.count().then((count) => {
      for (var i=0; i<count; i++) {
        expect(isTabVisible(tabPanes.get(i))).toBe(selectedIndex === i);
      }
    });
  }

  function getTabTitles(tabContainer) {
    return shadowDomQueryAll(tabContainer, 'button', (node) => node.textContent.trim() );
  }

  function isTabVisible(tabPane) {
    return shadowDomQuery(tabPane, '.tst-tab-content', (content) => !content.hidden);
  }

}