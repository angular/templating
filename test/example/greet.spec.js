describe('greet', function () {

  beforeEach(function () {
    browser.get('greet/index.html');
    // TODO: replace this with a proper protractor/ng2.0 integration
    // and remove this function as well as all method calls.
    browser.driver.sleep(SLEEP_INTERVAL)
  });

  it('should use a brick checkbox', () => {

    // Note: the nested input element is added by the brick component.
    // But checking that we know that the brick component is loaded correctly.
    var xToggleInputs = $$('x-toggle input[type=checkbox]');
    expect(xToggleInputs.count()).toBe(1);

  });

  it('should show one entry initially', () => {

    var greets = $$('exp-greet');
    expect(greets.count()).toBe(1);

  });

  it('should increment the counter on click', () => {

    var message = $('exp-greet .message');
    expect(message.getText()).toMatch(/Hello everybody \(0\)/);
    $('exp-greet button').click();
    expect(message.getText()).toMatch(/Hello everybody \(1\)/);

  });

  it('should validate the field using native input validation', () => {

    var message = $('exp-greet .message');
    var error = $('exp-greet .tst-error');

    expect(error.getText()).toMatch(/Please fill out this field/);
    expect(message.getText()).toMatch(/Error: true/);

    $('exp-greet .username').sendKeys('someUser');

    expect(error.getText()).not.toMatch(/Please fill out this field/);
    expect(message.getText()).toMatch(/Error: false/);

  });

  it('should add a new row when the checkbox is clicked', () => {

    $('x-toggle').click();
    expect($$('exp-greet').count()).toBe(2);

  });

  it('should remove all rows when the top most checkbox is deselected', () => {

    $('x-toggle').click();
    $$('x-toggle').get(1).click();
    expect($$('exp-greet').count()).toBe(3);

    $$('x-toggle').get(0).click();
    expect($$('exp-greet').count()).toBe(1);

  });

});