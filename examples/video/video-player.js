import {ComponentDirective} from 'templating';

@ComponentDirective({
  selector: 'video-player',
  bind: {
    'src': 'src'
  },
  query: [{
    selector: '::shadow #video',
    expression: 'video',
    collection: false
  }],
  shadowDOM: true
})
export class VideoPlayer {
  start() {
    this.video.src = this.src;
    this.video.play();
  }
  stop() {
    this.video.pause();
  }
}
