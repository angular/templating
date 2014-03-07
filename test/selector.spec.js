import {Selector} from '../src/selector';
import {Directive, DecoratorDirective} from '../src/annotations';
import {DirectiveClass} from '../src/directive_class';
import {DirectiveClassSet} from '../src/directive_class_set';

describe('Selector', () => {
  var selector;

  beforeEach(function() {
    addCustomMatcher();
    selector = createSelector();
  });

  it('should match directive on element', () => {
    expect(selector.matchElement(e('<b></b>')))
      .toEqualsDirectiveInfos([
        {"selector": 'b', "value": null}
      ]);
  });

  it('should match directive on class', () => {
    expect(selector.matchElement(e('<div class="a b c"></div>')))
      .toEqualsDirectiveInfos([
        { "selector": '.b', "value": null }
      ]);
  });

  it('should match directive on [attribute]', () => {
    expect(selector.matchElement(e('<div directive=abc></div>')))
      .toEqualsDirectiveInfos([
        { "selector": '[directive]', "value": 'abc', "name": 'directive'}
      ]);

    expect(selector.matchElement(e('<div directive></div>')))
      .toEqualsDirectiveInfos([
        { "selector": '[directive]', "value": '', "name": 'directive' 
      }]);
  });

  it('should match directive on element[attribute]', () => {
    expect(selector.matchElement(e('<b directive=abc></b>')))
      .toEqualsDirectiveInfos([
        { "selector": 'b', "value": null},
        { "selector": '[directive]', "value": 'abc'},
        { "selector": 'b[directive]', "value": 'abc'}
      ]);
  });

  it('should match directive on [attribute=value]', () => {
    expect(selector.matchElement(e('<div directive=value></div>')))
      .toEqualsDirectiveInfos([
        { "selector": '[directive]', "value": 'value'},
        { "selector": '[directive=value]', "value": 'value'}
      ]);
  });

  it('should match directive on element[attribute=value]', () => {
    expect(selector.matchElement(e('<b directive=value></div>')))
      .toEqualsDirectiveInfos([
        { "selector": 'b', "value": null, "name": null},
        { "selector": '[directive]', "value": 'value'},
        { "selector": '[directive=value]', "value": 'value'},
        { "selector": 'b[directive]', "value": 'value'},
        { "selector": 'b[directive=value]', "value": 'value'}
      ]);
  });

  it('should match attributes', () => {
    expect(selector.matchElement(e('<div attr="before-xyz-after"></div>')))
      .toEqualsDirectiveInfos([
        { "selector": '[*=/xyz/]', "value": 'attr=before-xyz-after',"name": 'attr'}
      ]);
  });

  it('should match attribute names', () => {
    expect(selector.matchElement(e('<div wildcard-match=ignored></div>')))
      .toEqualsDirectiveInfos([
        { "selector": '[wildcard-*]', "value": 'ignored', "name": 'wildcard-match'}
      ]);
  });

  it('should match text', () => {
    expect(selector.matchText(e('before-abc-after')))
      .toEqualsDirectiveInfos([
        { "selector": ':contains(/abc/)', "value": 'before-abc-after',"name": '#text'}
      ]);
  });

  it('should match on multiple directives', () => {
    expect(selector.matchElement(e('<div directive="d" foo="f"></div>')))
      .toEqualsDirectiveInfos([
        { "selector": '[directive]', "value": 'd'},
        { "selector": '[directive=d][foo=f]', "value": 'f'}
      ]);
  });

  it('should match ng-model + required on the same element', () => {
    expect(
      selector.matchElement(e('<input type="text" ng-model="val" probe="i" required="true" />')))
        .toEqualsDirectiveInfos([
          { "selector": '[ng-model]',                 "value": 'val'},
          { "selector": '[probe]',                    "value": 'i'},
          { "selector": '[ng-model][required]',       "value": 'true'},
          { "selector": 'input[type=text][ng-model]', "value": 'val'}
        ]);
  });

  it('should match two directives', () => {
    expect(
      selector.matchElement(e('<input type="text" my-model="val" required my-required />')))
        .toEqualsDirectiveInfos([
          { "selector": '[my-model][required]',    "value": ''},
          { "selector": '[my-model][my-required]', "value": ''}
        ]);
  });

  it('should match an two directives with the same selector', () => {
    expect(selector.matchElement(e('<div two-directives></div>')))
      .toEqualsDirectiveInfos([
        { "selector": '[two-directives]', "value": ''},
        { "selector": '[two-directives]', "value": ''}
      ]);
  });
});

function addCustomMatcher(){
  jasmine.addMatchers({
    toEqualsDirectiveInfos: function() {
      return {
        compare: function(actual, expected) {
          var pass = expected.length == actual.decorators.length;

          if (pass) {
            for (var i = 0, ii = expected.length; i < ii; i++) {
              var directiveClass = actual.decorators[i];
              var expectedMap = expected[i];

              pass = pass &&
                directiveClass.annotation.selector == expectedMap['selector'];
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

function createSelector(){
  var directives = [];

  addDirectiveClasses(_BElement, directives);
  addDirectiveClasses(_BClass, directives);
  addDirectiveClasses(_DirectiveAttr, directives);
  addDirectiveClasses(_WildcardDirectiveAttr, directives);
  addDirectiveClasses(_DirectiveFooAttr, directives);
  addDirectiveClasses(_BElementDirectiveAttr, directives);
  addDirectiveClasses(_DirectiveValueAttr, directives);
  addDirectiveClasses(_BElementDirectiveValue, directives);
  addDirectiveClasses(_ContainsAbc, directives);
  addDirectiveClasses(_AttributeContainsXyz, directives);
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

  var directiveClassSet = new DirectiveClassSet(null, directives);

  return directiveClassSet.selector();
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
@DecoratorDirective({selector:':contains(/abc/)'})         class _ContainsAbc{}
@DecoratorDirective({selector:'[*=/xyz/]'})                class _AttributeContainsXyz{}
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
