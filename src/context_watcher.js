import {EXECUTION_CONTEXT} from './annotations';

export class ContextWatcher {
  @Inject(EXECUTION_CONTEXT)
  constructor(executionContext) {
    this.executionContext = executionContext;
  }	
}
