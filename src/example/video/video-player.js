import {ComponentDirective, AttachAware, QueryScope, InjectQuery} from 'templating';

@ComponentDirective({
  selector: 'video-player',
  shadowDOM: true
})
export class VideoPlayer {
  constructor(@InjectQuery('video', QueryScope.SHADOW) videos) {
    this.videos = videos;
  }
  start() {
    var video = this.videos[0];
    video.src = this.src;
    // Add a property for our e2e tests to verify that the video was played indeed.
    video.tstPlayed = true;
    video.play();
  }
  stop() {
    var video = this.videos[0];
    video.pause();
  }
}
