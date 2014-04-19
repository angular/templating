import {inject, use} form 'di/testing';
import {Selector} from '../../src/compiler/selector';
import {Directive, DecoratorDirective} from '../../src/annotations';
import {DirectiveClass} from '../../src/compiler/directive_class';
import {SelectorConfig} from '../../src/compiler/selector_config';
import {$, $0} from '../dom_mocks';

describe('Selector', () => {
  var selector, directives, config;

  beforeEach(function() {
    addCustomMatcher();
    directives = createDirectives();
    inject(Selector, SelectorConfig, (_selector, _config)=>{
      selector = _selector;
      config = _config;
    });
  });

  describe('matchElement', () => {
    it('should match directive on element', () => {
      expect(selector.matchElement(directives, e('<b></b>')))
        .toEqualsDirectiveInfos([
          {"selector": 'b', "value": null}
        ]);
    });

    it('should match directive on class', () => {
      expect(selector.matchElement(directives, e('<div class="a b c"></div>')))
        .toEqualsDirectiveInfos([
          { "selector": '.b', "value": null }
        ]);
    });

    it('should match directive on [attribute]', () => {
      expect(selector.matchElement(directives, e('<div directive=abc></div>')))
        .toEqualsDirectiveInfos([
          { "selector": '[directive]', "value": 'abc', "name": 'directive'}
        ]);

      expect(selector.matchElement(directives, e('<div directive></div>')))
        .toEqualsDirectiveInfos([
          { "selector": '[directive]', "value": '', "name": 'directive'
        }]);
    });

    it('should match directive on element[attribute]', () => {
      expect(selector.matchElement(directives, e('<b directive=abc></b>')))
        .toEqualsDirectiveInfos([
          { "selector": 'b', "value": null},
          { "selector": '[directive]', "value": 'abc'},
          { "selector": 'b[directive]', "value": 'abc'}
        ]);
    });

    it('should match directive on [attribute=value]', () => {
      expect(selector.matchElement(directives, e('<div directive=value></div>')))
        .toEqualsDirectiveInfos([
          { "selector": '[directive]', "value": 'value'},
          { "selector": '[directive=value]', "value": 'value'}
        ]);
    });

    it('should match directive on element[attribute=value]', () => {
      expect(selector.matchElement(directives, e('<b directive=value></div>')))
        .toEqualsDirectiveInfos([
          { "selector": 'b', "value": null, "name": null},
          { "selector": '[directive]', "value": 'value'},
          { "selector": '[directive=value]', "value": 'value'},
          { "selector": 'b[directive]', "value": 'value'},
          { "selector": 'b[directive=value]', "value": 'value'}
        ]);
    });

    it('should match whildcard attributes', () => {
      expect(selector.matchElement(directives, e('<div wildcard-match=ignored></div>')))
        .toEqualsDirectiveInfos([
          { "selector": '[wildcard-*]', "value": 'ignored', "name": 'wildcard-match'}
        ]);
    });

    it('should match on multiple directives', () => {
      expect(selector.matchElement(directives, e('<div directive="d" foo="f"></div>')))
        .toEqualsDirectiveInfos([
          { "selector": '[directive]', "value": 'd'},
          { "selector": '[directive=d][foo=f]', "value": 'f'}
        ]);
    });

    it('should match ng-model + required on the same element', () => {
      expect(
        selector.matchElement(directives, e('<input type="text" ng-model="val" probe="i" required="true" />')))
          .toEqualsDirectiveInfos([
            { "selector": '[ng-model]',                 "value": 'val'},
            { "selector": '[probe]',                    "value": 'i'},
            { "selector": '[ng-model][required]',       "value": 'true'},
            { "selector": 'input[type=text][ng-model]', "value": 'val'}
          ]);
    });

    it('should match two directives', () => {
      expect(
        selector.matchElement(directives, e('<input type="text" my-model="val" required my-required />')))
          .toEqualsDirectiveInfos([
            { "selector": '[my-model][required]',    "value": ''},
            { "selector": '[my-model][my-required]', "value": ''}
          ]);
    });

    it('should match on two directives with the same selector', () => {
      expect(selector.matchElement(directives, e('<div two-directives></div>')))
        .toEqualsDirectiveInfos([
          { "selector": '[two-directives]', "value": ''},
          { "selector": '[two-directives]', "value": ''}
        ]);
    });

    describe('match bindings', function() {
      it('should convert attr interpolation into bind-...', () => {
        expect(selector.matchElement(directives, e('<div test="{{a}}"></div>')).attrs.bind)
          .toEqual({'test': "''+(a)+''"});

        expect(selector.matchElement(directives, e('<div test="{{1+2}}"></div>')).attrs.bind)
          .toEqual({'test': "''+(1+2)+''"});

        // camel case conversion
        expect(selector.matchElement(directives, e('<div test-a="{{a}}"></div>')).attrs.bind)
          .toEqual({'testA': "''+(a)+''"});
      });

      it('should save bind-... attributes', () => {
        expect(selector.matchElement(directives, e('<div bind-test="a"></div>')).attrs.bind)
          .toEqual({'test':'a'});

        // camel case conversion
        expect(selector.matchElement(directives, e('<div bind-test-a="a"></div>')).attrs.bind)
          .toEqual({'testA': 'a'});
      });

      it('should save normal attributes if there are other bindings', () => {
        expect(selector.matchElement(directives, e('<b test="a"></b>')).attrs.init)
          .toEqual({'test': 'a'});

        // camel case conversion
        expect(selector.matchElement(directives, e('<div test-a="a"></div>')).attrs.init)
          .toEqual({'testA': 'a'});
      });

    });

    describe('match events', () => {

      it('should find events for matched directives with an "on" property', ()=>{
        @DecoratorDirective({
          selector: '[a]',
          on: {
            click: 'doClick()'
          }
        })
        class SomeDirective {

        }
        addDirectiveClasses(SomeDirective, directives);
        expect(selector.matchElement(directives, e('<div a="b"></div>')).events).toEqual([
          {event: 'click', handler: 'directive', expression: 'doClick()', directive: SomeDirective}
        ]);
      });

      it('should find events for on-* attributes', ()=>{
        expect(selector.matchElement(directives, e('<div on-test="a"></div>')).events).toEqual([
          {event: 'test', handler: 'onEvent', expression: 'a'}
        ]);
      });

      it('should find refreshNode events that are defined in the SelectorConfig', ()=>{
        config.refreshNodePropertyEvents = [
          {nodeName: 'input', events: ['event1', 'event2'], properties: ['someProp']},
        ];
        expect(selector.matchElement(directives, e('<input>')).events).toEqual([
          {event: 'event1', handler: 'refreshNode', properties: ['someProp']},
          {event: 'event2', handler: 'refreshNode', properties: ['someProp']}
        ]);
        expect(selector.matchElement(directives, e('<div>')).events).toEqual([]);
      });
    });

  });

  describe('matchText', () => {
    it('should not match text without interpolation', () => {
      expect(selector.matchText(e('a b c'))).toBeFalsy();
    });
    it('should convert interpolation into expression strings', () => {
      expect(selector.matchText(e('{{a}}'))).toBe("''+(a)+''");
      expect(selector.matchText(e('a{{b}}{{c}}d'))).toBe("'a'+(b)+''+(c)+'d'");
      expect(selector.matchText(e('a{{1+2}}d'))).toBe("'a'+(1+2)+'d'");
    });
  });

});

function addCustomMatcher(){
  jasmine.addMatchers({
    toEqualsDirectiveInfos: function() {
      return {
        compare: function(actual, expected) {
          var pass;
          if (!actual) {
            pass = expected.length === 0;
          } else {
            pass = expected.length == actual.decorators.length;
            if (pass) {
              for (var i = 0, ii = expected.length; i < ii; i++) {
                var directiveClass = actual.decorators[i];
                var expectedMap = expected[i];

                pass = pass &&
                  directiveClass.annotation.selector == expectedMap['selector'];
              }
            }
          }

          return {
            pass: pass
          };
        }
      };
    }
  });
}

function createDirectives(){
  var directives = [];

  addDirectiveClasses(_BElement, directives);
  addDirectiveClasses(_BClass, directives);
  addDirectiveClasses(_DirectiveAttr, directives);
  addDirectiveClasses(_WildcardDirectiveAttr, directives);
  addDirectiveClasses(_DirectiveFooAttr, directives);
  addDirectiveClasses(_BElementDirectiveAttr, directives);
  addDirectiveClasses(_DirectiveValueAttr, directives);
  addDirectiveClasses(_BElementDirectiveValue, directives);
  addDirectiveClasses(_Component, directives);
  addDirectiveClasses(_Attribute, directives);
  addDirectiveClasses(_Structural, directives);
  addDirectiveClasses(_IgnoreChildren, directives);
  addDirectiveClasses(_TwoDirectives, directives);
  addDirectiveClasses(_OneOfTwoDirectives, directives);
  addDirectiveClasses(_TwoOfTwoDirectives, directives);
  addDirectiveClasses(_NgModel, directives);
  addDirectiveClasses(_Probe, directives);
  addDirectiveClasses(_NgModelRequired, directives);
  addDirectiveClasses(_TextInputNgModel, directives);
  return directives;
}

function addDirectiveClasses(directive, directives){
  if (!directive.annotations || !directive.annotations.length) {
    throw new Error(`Missing directive annotation for ${directive}`);
  }

  var annotations = directive.annotations;

  for (var annotation of annotations) {
    if (annotation instanceof Directive) {
      directives.push(new DirectiveClass(annotation, directive));
    }
  }
}

function es(html) {
  var div = document.createElement('div');
  div.innerHTML = html;
  return div.childNodes;
}

function e(html) {
  var nodes = es(html);
  return nodes[0];
}

@DecoratorDirective({selector:'b'})                        class _BElement{}
@DecoratorDirective({selector:'.b'})                       class _BClass{}
@DecoratorDirective({selector:'[directive]'})              class _DirectiveAttr{}
@DecoratorDirective({selector:'[wildcard-*]'})             class _WildcardDirectiveAttr{}
@DecoratorDirective({selector:'[directive=d][foo=f]'})     class _DirectiveFooAttr{}
@DecoratorDirective({selector:'b[directive]'})             class _BElementDirectiveAttr{}
@DecoratorDirective({selector:'[directive=value]'})        class _DirectiveValueAttr{}
@DecoratorDirective({selector:'b[directive=value]'})       class _BElementDirectiveValue{}
@DecoratorDirective({selector:'component'})                class _Component{}
@DecoratorDirective({selector:'[attribute]'})              class _Attribute{}
@DecoratorDirective({selector:'[structural]',
             //children: NgAnnotation.TRANSCLUDE_CHILDREN
           })
                                                  class _Structural{}

@DecoratorDirective({selector:'[ignore-children]',
             //children: NgAnnotation.IGNORE_CHILDREN
           })
                                                  class _IgnoreChildren{}

@DecoratorDirective({selector: '[my-model][required]'})
@DecoratorDirective({selector: '[my-model][my-required]'})    class _TwoDirectives {}
@DecoratorDirective({selector: '[two-directives]'})           class _OneOfTwoDirectives {}
@DecoratorDirective({selector: '[two-directives]'})           class _TwoOfTwoDirectives {}

@DecoratorDirective({selector: '[ng-model]'})                 class _NgModel{}
@DecoratorDirective({selector: '[probe]'})                    class _Probe{}
@DecoratorDirective({selector: '[ng-model][required]'})       class _NgModelRequired{}
@DecoratorDirective({selector: 'input[type=text][ng-model]'}) class _TextInputNgModel{}
