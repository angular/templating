describe('ngmodel ', function () {

  beforeEach(function () {
    browser.get('ngmodel/index.html');
    // TODO: replace this with a proper protractor/ng2.0 integration
    // and remove this function as well as all method calls.
    browser.driver.sleep(SLEEP_INTERVAL);
  });

  it('should be invalid on load', () => {

    expect($('.tst-valid').getText()).toMatch(/false/);

  });

  it('should be invalid for a random text', () => {

    var input = $('input[type=text]');
    input.sendKeys('random');
    expect($('.tst-valid').getText()).toMatch(/false/);

  });

  it('should be valid for the text "secret"', () => {

    var input = $('input[type=text]');
    input.sendKeys('secret');
    expect($('.tst-valid').getText()).toMatch(/true/);

  });

});