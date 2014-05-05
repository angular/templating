import {ComponentDirective} from 'templating';

@ComponentDirective({
  selector: 'app'
})
export class App {
    constructor() {
        this.route = null;
    }
}
