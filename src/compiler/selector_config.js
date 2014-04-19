export class SelectorConfig {
  constructor() {
    this.interpolationRegex = /{{(.*?)}}/g;
    this.bindAttrRegex = /bind-(.+)/;
    this.eventAttrRegex = /on-(.+)/;
    // TODO: make this modular (e.g. just like directives...)
    this.refreshNodePropertyEvents = [
      {nodeName: 'input', events: ['input', 'keypress', 'change'], properties: ['value', 'valueAsDate', 'valueAsNumber']},
      {nodeName: 'textarea', events: ['input', 'keypress', 'change'], properties: ['value']},
      {nodeName: 'select', events: ['change'], properties: ['value']}
    ];
  }
}
