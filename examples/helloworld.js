import {ComponentDirective} from 'templating/annotations';

// TODO: next step: externalize the template into a separate file
// and have our compiler automatically compile it
@ComponentDirective({
  selector: 'exp-hello',
  template: '<input type="text" bind-value="user">{{greet(user)}}'
})
export class FirstComponent {
  constructor() {
  }
  greet(name) {
    return 'Hello '+name;
  }
}
