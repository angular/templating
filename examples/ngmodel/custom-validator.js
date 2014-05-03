import {DecoratorDirective} from 'templating';
import {Validator} from './validator';

@DecoratorDirective({
  selector: '[custom-validator]',
})
export class CustomValidator extends Validator {
  validate(value) {
    return value === 'secret';
  }
}
