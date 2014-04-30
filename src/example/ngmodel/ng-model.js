import {DecoratorDirective, QueryScope, InjectQuery, AttachAware} from 'templating';

@DecoratorDirective({
  selector: '[ng-model]',
  bind: {
    'value': 'value',
    'ngModelValid': 'ngModelValid'
  },
  observe: {
    'value': 'validate'
  }
})
@AttachAware
export class NgModel {
  constructor(@InjectQuery('validator', QueryScope.THIS) validators) {
    this.validators = validators;
  }
  diAttached() {
    this.validate();
  }
  validate() {
    var valid = true;
    this.validators.forEach((validator) => {
      valid = valid && validator.validate(this.value);
    })
    this.ngModelValid = valid;
  }
}
