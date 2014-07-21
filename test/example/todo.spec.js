describe('todo ', function () {
  beforeEach(function () {
    browser.get('todo/index.html');
    // TODO: replace this with a proper protractor/ng2.0 integration
    // and remove this function as well as all method calls.
    browser.driver.sleep(SLEEP_INTERVAL);
  });

  it('should show 3 todos initially', () => {

    expect($('.tst-todo-count').getText()).toBe('3');
    var todoTitles = $$('.tst-todo-title');
    expect(todoTitles.count()).toBe(3);
    expect(todoTitles.get(0).getText()).toBe('make coffee');
    expect(todoTitles.get(1).getText()).toBe('buy milk');
    expect(todoTitles.get(2).getText()).toBe('work');

  });

  it('should add a todo', () => {

    $('.tst-todo-new').sendKeys('new todo');
    $('.tst-todo-add').click();

    expect($('.tst-todo-count').getText()).toBe('4');
    expect($$('.tst-todo-title').get(3).getText()).toBe('new todo');

  });

  it('should remove a todo', () => {

    $$('.tst-todo-done').get(0).click();
    expect($('.tst-todo-count').getText()).toBe('2');
    expect($$('.tst-todo-title').count()).toBe(2);

  });

});