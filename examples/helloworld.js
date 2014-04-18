import {ComponentDirective} from 'templating';
import {promise as greetTemplate} from './greet.html';

@ComponentDirective({
  selector: 'exp-hello',
  template: greetTemplate,
  bind: {'user':'user'}
})
export class FirstComponent {
  constructor() {
    this.counter = 0;
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
