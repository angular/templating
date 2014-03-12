import {TemplateDirective, EXECUTION_CONTEXT} from '../annotations';
import {Injector} from 'di/injector';
import {Inject} from 'di/annotations';
import {View, ViewPort} from '../view';
import {ViewFactory} from '../view_factory';


@TemplateDirective({selector: '[ng-if]'})
export class NgIf {
  @Inject(ViewFactory, ViewPort, EXECUTION_CONTEXT, Injector)
  constructor(viewFactory, viewPort, executionContext, injector) {
    this.viewPort = viewPort;
    this.viewFactory = viewFactory;
    this.injector = injector;
    this.executionContext = executionContext;
    this._ngIf = null;
    this.view = null;
    Object.defineProperty(this, 'ngIf', {
      get: function() {
        return this.ngIfGetter();
      },
      set: function(value) {
        this.ngIfSetter(value);
      }
    });
  }
  /* TODO: not working with traceur right now
  set ngIf(value) {}
  */
  ngIfGetter() {
    return this._ngIf;
  }
  ngIfSetter(value) {
    if (!value && this.view) {
      this.viewPort.remove(this.view);
      this.view = null;
    }
    if (value) {
      this.view = this.viewFactory.createView(this.injector, this.executionContext);
      this.viewPort.append(this.view);
    }
  }
}
