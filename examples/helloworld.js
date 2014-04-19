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
    return 'Hello '+name + ' ' + this.counter;
  }
  incCounter() {
    this.counter++;
  }
}
