import {ComponentDirective} from 'templating';
import {promise as greetTemplate} from './greet.html';

@ComponentDirective({
  selector: 'exp-greet',
  template: greetTemplate
})
export class FirstComponent {
  constructor() {
    this.counter = 0;
    this.user = null;
  }

  greet(name) {
    if (!name) {
      return 'Hello everybody (' + this.counter + ')';
    }

    return 'Hello ' + name + ' (' + this.counter + ')';
  }

  incCounter() {
    this.counter++;
  }
}
