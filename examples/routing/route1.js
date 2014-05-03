import {Inject} from 'di';
import {App} from './app';
import {ComponentDirective} from 'templating';

@ComponentDirective({
  selector: 'exp-route1'
})
export class Route1 {
  @Inject(App)
  constructor(app) {
    this.app = app;
  }
}
