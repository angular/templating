import {ComponentDirective} from 'templating/annotations';


// TODO: next step: externalize the template into a separate file
// and have our compiler automatically compile it
@ComponentDirective({
  selector: 'exp-hello',
  template: 'Hello world!'
})
export class FirstComponent {
  constructor() {
  }
}
