var {shadowDomQuery, shadowDomQueryAll} = require('./shadow-dom-util');

describe('ngmodel ', function () {

  beforeEach(function () {
    browser.get('video/index.html');
    // TODO: replace this with a proper protractor/ng2.0 integration
    // and remove this function as well as all method calls.
    browser.driver.sleep(SLEEP_INTERVAL);
  });

  it('should not play a video on load', () => {

    expect(readVideo()).toEqual({src: '', tstPlayed: null});

  });

  it('should play a video on click', () => {

    startVideo();
    expect(readVideo()).toEqual({
      src: 'http://v2v.cc/~j/theora_testsuite/320x240.ogg',
      tstPlayed: true
    });

  });

  function startVideo() {
    shadowDomQuery($('video-player'), '.tst-start', (button) => button.click() );
  }

  function readVideo() {
    return shadowDomQuery($('video-player'), 'video', (video) => {
      return { src: video.src, tstPlayed: video.tstPlayed }
    });
  }

});