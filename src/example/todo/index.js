import {ComponentDirective} from 'templating';

@ComponentDirective()
export class App {
  constructor() {
    // TODO: This is needed as ngRepeat creates a child object as execution context.
    // when an expression in that child object is evaluated we
    // get that child object as current "this", and not our original "this"
    this.addTodo = this.addTodo.bind(this);
    this.removeTodo = this.removeTodo.bind(this);
    this.todos = [{
      title: 'make coffee'
    },{
      title: 'buy milk'
    },{
      title: 'work'
    }];
    this.newTodoTitle = null;
  }
  addTodo() {
    this.todos.push({
      title: this.newTodoTitle
    });
    this.newTodoTitle = null;
  }
  removeTodo(todo) {
    var index = this.todos.indexOf(todo);
    this.todos.splice(index, 1);
  }
}