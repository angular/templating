import {DecoratorDirective, Queryable} from 'templating';

@DecoratorDirective({
  selector: '[custom-validator]'
})
@Queryable('validator')
export class CustomValidator {
  validate(value) {
    return value === 'secret';
  }
}
