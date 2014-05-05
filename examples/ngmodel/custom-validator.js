import {DecoratorDirective} from 'templating';
import {Validator} from './validator';

@DecoratorDirective({
  selector: '[custom-validator]',
  role: 'validator'
})
export class CustomValidator extends Validator {
  validate(value) {
    return value === 'secret';
  }
}
