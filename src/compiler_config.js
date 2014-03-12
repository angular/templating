export class CompilerConfig {
  constructor() {
    this.interpolationRegex = /{{(.*?)}}/g;
    this.bindAttrRegex = /bind-(.+)/;
    this.eventAttrRegex = /on-(.+)/;
  }
}
