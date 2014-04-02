import {ComponentDirective} from 'templating';
import {viewFactory} from './greet.html';

@ComponentDirective({
  selector: 'exp-hello',
  template: viewFactory
})
export class FirstComponent {
  constructor() {
  }
  greet(name) {
    return 'Hello '+name;
  }
}
