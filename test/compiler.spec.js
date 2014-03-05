import {use, inject} from 'di/testing';
import {Compiler} from '../src/compiler';
import {Selector} from '../src/selector/selector';
import {ElementBinderImpl} from '../src/element_binder';
import {TextBinder} from '../src/element_binder';
import {DirectiveClass} from '../src/directive_class';
import {TemplateDirective} from '../src/annotations';
import {DecoratorDirective} from '../src/annotations';
import {ComponentDirective} from '../src/annotations';
import {ViewFactory} from '../src/view_factory';

describe('Compiler', ()=>{
  var selector:Selector,
      container,
      binders,
      attrDirectiveAnnotations;

  describe('mark nodes with directives and collect binders', ()=> {
    it('should work for one element', function() {
      createSelector([ new DecoratorDirective({selector: '[name]'}) ]);

      // all possible combinations of elements with decorators and elements
      // without decorators
      compileAndVerifyBinders('<div></div>', '()');
      compileAndVerifyBinders('<div name="1"></div>', '(),1()');
    });

    it('should work for two sibling elements', function() {
      createSelector([ new DecoratorDirective({selector: '[name]'}) ]);

      // all possible combinations of elements with decorators and elements
      // without decorators
      compileAndVerifyBinders('<div></div><div></div>', '()');
      compileAndVerifyBinders('<div name="1"></div><div></div>', '(),1()');
      compileAndVerifyBinders('<div></div><div name="1"></div>', '(),1()');
      compileAndVerifyBinders('<div name="1"></div><div name="2"></div>', '(),1(),2()');
    });

    it('should work for nested elements', function() {
      createSelector([ new DecoratorDirective({selector: '[name]'}) ]);

      // all possible combinations of elements with decorators and elements
      // without decorators
      compileAndVerifyBinders('<div><span></span></div>', '()');
      compileAndVerifyBinders('<div name="1"><span></span></div>', '(),1()');
      compileAndVerifyBinders('<div><span name="1"></span></div>', '(),1()');
      compileAndVerifyBinders('<div name="1"><span name="2"></span></div>', '(),1(),2()');
      compileAndVerifyBinders('<div><span name="1"></span><span></span></div>', '(),1()');
      compileAndVerifyBinders('<div><span></span><span name="1"></span></div>', '(),1()');
    });

  });

  describe('compile text nodes', ()=>{
    it('should create TextBinders for text nodes', ()=>{
      createSelector();

      // different combinations of where interpolated text nodes can be
      compileAndVerifyBinders('', '()');
      compileAndVerifyBinders('a', '()');
      compileAndVerifyBinders('{{a}}', '({{a}})');
      compileAndVerifyBinders('<span>a</span>', '()');
      compileAndVerifyBinders('{{a}}<span>{{b}}</span>{{c}}', '({{a}},{{c}}),({{b}})');
      compileAndVerifyBinders('<span>{{a}}</span>', '(),({{a}})');
      compileAndVerifyBinders('<span><div></div>{{a}}</span>', '(),({{a}})');
      compileAndVerifyBinders('<span>{{a}}<div></div>{{b}}</span>', '(),({{a}},{{b}})');
      compileAndVerifyBinders('<span>{{a}}<div>{{b}}</div>{{c}}</span>', '(),({{a}},{{c}}),({{b}})');
    });
  });

  describe('compile the template of component directives', () => {

    it('should compile inline templates', ()=>{
      var template = '{{a}}<span name="1">{{b}}</span>';
      createSelector([ 
          new DecoratorDirective({selector: '[name]'}),
          new ComponentDirective({selector: '[comp]', template: template})
      ]);
      compile('<div comp></div>');
      switchToComponentDirective();
      expect(container.html()).toBe('{{a}}<span name="1" class="ng-binder">{{b}}</span>');
      verifyBinders('({{a}}),1({{b}})');
    });

    it('should compile with a given component viewFactory', ()=>{
      createSelector([
          new DecoratorDirective({selector: '[name]'})
      ]);
      compile('{{a}}<span name="1">{{b}}</span>');
      var componentViewFactory = new ViewFactory(container[0].childNodes, binders);

      createSelector([
          new DecoratorDirective({selector: '[name]'}),
          new ComponentDirective({selector: '[comp]', template: componentViewFactory})
      ]);
      compile('<div comp></div>');
      switchToComponentDirective();

      expect(container.html()).toBe('{{a}}<span name="1" class="ng-binder">{{b}}</span>');
      verifyBinders('({{a}}),1({{b}})');
    });

  });

  describe('compile template directives', () => {

    it('should work for template directives on a non template element', ()=>{
      createSelector([ 
        new DecoratorDirective({selector: '[name]'}),
        new TemplateDirective({selector: '[tpl]'}) 
      ]);

      // template directive is on root node
      compile('<div tpl>a</div>');
      verifyBinders('(<!--template anchor-->)');
      expect(container.html()).toBe('<!--template anchor-->');
      switchToTemplateDirective();
      verifyBinders('()');
      expect(container.html()).toBe('<div tpl="">a</div>');

      // template directive is on child node
      compile('<div><span tpl>a</span></div>');
      verifyBinders('(),(<!--template anchor-->)');
      expect(container.html()).toBe('<div class="ng-binder"><!--template anchor--></div>');
      switchToTemplateDirective();
      verifyBinders('()');
      expect(container.html()).toBe('<span tpl="">a</span>');
      
      // template is after another text node
      compile('<div>a<span tpl>b</span></div>');
      verifyBinders('(),(<!--template anchor-->)');
      expect(container.html()).toBe('<div class="ng-binder">a<!--template anchor--></div>');
      switchToTemplateDirective();
      verifyBinders('()');
      expect(container.html()).toBe('<span tpl="">b</span>');

      // template has other directives on same node
      compile('<div><span tpl name="1">a</span></div>');
      verifyBinders('(),(<!--template anchor-->)');
      expect(container.html()).toBe('<div class="ng-binder"><!--template anchor--></div>');        
      switchToTemplateDirective();
      verifyBinders('(),1()');
      expect(container.html()).toBe('<span tpl="" name="1" class="ng-binder">a</span>');

      // template contains other directives on child elements
      compile('<div tpl=""><span name="1">a</span></div>');
      verifyBinders('(<!--template anchor-->)');
      switchToTemplateDirective();
      verifyBinders('(),1()');
      expect(container.html()).toBe('<div tpl=""><span name="1" class="ng-binder">a</span></div>');

    });

    it('should work for template directives on a template elements', ()=>{
      createSelector([ 
        new DecoratorDirective({selector: '[name]'}),
        new TemplateDirective({selector: '[tpl]'}) 
      ]);

      // template directive is on root node
      compile('<template tpl>a</tempate>');
      verifyBinders('(<!--template anchor-->)');
      expect(container.html()).toBe('<!--template anchor-->');
      switchToTemplateDirective();
      verifyBinders('()');
      expect(container.html()).toBe('a');

      // template directive is on child node
      compile('<div><template tpl>a</template></div>');
      verifyBinders('(),(<!--template anchor-->)');
      expect(container.html()).toBe('<div class="ng-binder"><!--template anchor--></div>');
      switchToTemplateDirective();
      verifyBinders('()');
      expect(container.html()).toBe('a');
      
      // template is after another text node
      compile('<div>a<template tpl>b</template></div>');
      verifyBinders('(),(<!--template anchor-->)');
      expect(container.html()).toBe('<div class="ng-binder">a<!--template anchor--></div>');
      switchToTemplateDirective();
      verifyBinders('()');
      expect(container.html()).toBe('b');
     
      // template has other directives on same node
      // (should be ignored)
      compile('<div><template tpl name="1">a</template></div>');
      verifyBinders('(),(<!--template anchor-->)');
      expect(container.html()).toBe('<div class="ng-binder"><!--template anchor--></div>');        
      switchToTemplateDirective();
      verifyBinders('()');
      expect(container.html()).toBe('a');

      // template contains other directives on child elements
      compile('<template tpl=""><span name="1">a</span></template>');
      verifyBinders('(<!--template anchor-->)');
      switchToTemplateDirective();
      verifyBinders('(),1()');
      expect(container.html()).toBe('<span name="1" class="ng-binder">a</span>');
    });
  });

  function createSelector(directives = []) {    
    attrDirectiveAnnotations = {};
    directives.forEach(function(annotation) {
      var attr = extractAttrSelector(annotation);
      attrDirectiveAnnotations[attr] = annotation;
    });      
    selector = new Selector(directives.map((annotation) => {
      return new DirectiveClass(annotation, function() {});
    }), null);

    function extractAttrSelector(directiveAnnotation) {
      if (!directiveAnnotation) {
        return null;
      }
      var match = /\[(\w+)\]/.exec(directiveAnnotation.selector);
      if (!match) {
        throw new Error('mock selector only supports attribute names as selector!');
      }
      return match[1];
    }
  }

  function compile(html) {
    inject(Compiler, (compiler)=>{
      container = $('<div></div>');
      container.html(html);
      var nodes = container.contents();
      binders = compiler.compile(nodes, selector).elementBinders;
    });
  }

  function stringifyBinders() {
    var structureAsString = [];
    var elements = container.find('.ng-binder');

    binders.forEach(function(elementBinder, binderIndex) {
      elementBinder = binders[binderIndex];
      // Note: It's important to select the element
      // only by the index in the binders array
      var element = binderIndex > 0 ? elements[binderIndex-1]: container[0];
              
      var nonElementBindersAsString = [];
      elementBinder.nonElementBinders.forEach(function(textBinder, textIndex) {
        // Note: It's important to select the text/comment node
        // only by the index in the binders array and the indexInParent 
        // of NonElementBinders, as this is what the ViewFactory
        // also does.
        textBinder = elementBinder.nonElementBinders[textIndex];
        var node = element.childNodes[textBinder.indexInParent];
        var nodeValue = node.nodeValue;
        if (node.nodeType === Node.COMMENT_NODE) {
          nodeValue = '<!--'+nodeValue+'-->';
        }
        nonElementBindersAsString.push(nodeValue);
      });
      var annotationValues = '';
      for (var attrName in attrDirectiveAnnotations) {
        var attrValue = element.getAttribute(attrName);
        if (attrValue) {
          annotationValues+=attrValue;
        }
      }
      structureAsString.push(annotationValues + '(' + nonElementBindersAsString.join(',') + ')');
    });
    return structureAsString.join(',');
  }

  function compileAndVerifyBinders(html, expectedStructureAsString) {
    compile(html);
    verifyBinders(expectedStructureAsString);
  }

  function verifyBinders(expectedStructureAsString) {
    var elements = container.find('.ng-binder');
    expect(binders.length).toBe(elements.length+1);
    expect(stringifyBinders()).toBe(expectedStructureAsString);
  }

  function switchToTemplateDirective() {
    var viewFactory;
    binders.forEach(function(binder) {
      if (binder.nonElementBinders) {
        binder.nonElementBinders.forEach(function(nonElementBinder) {
          if (nonElementBinder.viewFactory) {
            viewFactory = nonElementBinder.viewFactory;
          }
        });
      }
    });
    expect(viewFactory).toBeTruthy();
    // update the global variables
    container.html('');
    container.append(viewFactory.templateNodes);
    binders = viewFactory.elementBinders;  
  }

  function switchToComponentDirective() {
    var viewFactory;
    binders.forEach(function(binder) {
      if (binder.component) {
        viewFactory = binder.componentViewFactory;
      }
    });
    expect(viewFactory).toBeTruthy();
    // update the global variables
    container.html('');
    container.append(viewFactory.templateNodes);
    binders = viewFactory.elementBinders;  
  }
});
