import {ComponentDirective} from 'templating';
import {viewFactory} from 'templating!./greet';

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
