import {Selector} from '../src/selector';
import {Directive} from '../src/annotations';
import {DirectiveClass} from '../src/directive_class';
import {DirectiveClassSet} from '../src/directive_class_set';

describe('Selector', () => {
  var selector;

  beforeEach(function() {
    addCustomMatcher();
    selector = createSelector();
  });

  it('should match directive on element', () => {
    expect(selector.match(e('<b></b>')))
      .toEqualsDirectiveInfos([
        {"selector": 'b', "value": null}
      ]);
  });

  it('should match directive on class', () => {
    expect(selector.match(e('<div class="a b c"></div>')))
      .toEqualsDirectiveInfos([
        { "selector": '.b', "value": null }
      ]);
  });

  it('should match directive on [attribute]', () => {
    expect(selector.match(e('<div directive=abc></div>')))
      .toEqualsDirectiveInfos([
        { "selector": '[directive]', "value": 'abc', "name": 'directive'}
      ]);

    expect(selector.match(e('<div directive></div>')))
      .toEqualsDirectiveInfos([
        { "selector": '[directive]', "value": '', "name": 'directive' 
      }]);
  });

  it('should match directive on element[attribute]', () => {
    expect(selector.match(e('<b directive=abc></b>')))
      .toEqualsDirectiveInfos([
        { "selector": 'b', "value": null},
        { "selector": '[directive]', "value": 'abc'},
        { "selector": 'b[directive]', "value": 'abc'}
      ]);
  });

  it('should match directive on [attribute=value]', () => {
    expect(selector.match(e('<div directive=value></div>')))
      .toEqualsDirectiveInfos([
        { "selector": '[directive]', "value": 'value'},
        { "selector": '[directive=value]', "value": 'value'}
      ]);
  });

  it('should match directive on element[attribute=value]', () => {
    expect(selector.match(e('<b directive=value></div>')))
      .toEqualsDirectiveInfos([
        { "selector": 'b', "value": null, "name": null},
        { "selector": '[directive]', "value": 'value'},
        { "selector": '[directive=value]', "value": 'value'},
        { "selector": 'b[directive]', "value": 'value'},
        { "selector": 'b[directive=value]', "value": 'value'}
      ]);
  });

  it('should match attributes', () => {
    expect(selector.match(e('<div attr="before-xyz-after"></div>')))
      .toEqualsDirectiveInfos([
        { "selector": '[*=/xyz/]', "value": 'attr=before-xyz-after',"name": 'attr'}
      ]);
  });

  it('should match attribute names', () => {
    expect(selector.match(e('<div wildcard-match=ignored></div>')))
      .toEqualsDirectiveInfos([
        { "selector": '[wildcard-*]', "value": 'ignored', "name": 'wildcard-match'}
      ]);
  });

  it('should match text', () => {
    expect(selector.match(e('before-abc-after')))
      .toEqualsDirectiveInfos([
        { "selector": ':contains(/abc/)', "value": 'before-abc-after',"name": '#text'}
      ]);
  });

  it('should sort by priority', () => {
    expect(selector.match(e(
      '<component attribute ignore-children structural></component>')))
      .toEqualsDirectiveInfos([
        { "selector": "[structural]", "value": ""},
        { "selector": "[attribute]", "value": "" },
        { "selector": "[ignore-children]", "value": "" },
        { "selector": "component", "value": null}
      ]);
  });

  it('should match on multiple directives', () => {
    expect(selector.match(e('<div directive="d" foo="f"></div>')))
      .toEqualsDirectiveInfos([
        { "selector": '[directive]', "value": 'd'},
        { "selector": '[directive=d][foo=f]', "value": 'f'}
      ]);
  });

  it('should match ng-model + required on the same element', () => {
    expect(
      selector.match(e('<input type="text" ng-model="val" probe="i" required="true" />')))
        .toEqualsDirectiveInfos([
          { "selector": '[ng-model]',                 "value": 'val'},
          { "selector": '[probe]',                    "value": 'i'},
          { "selector": '[ng-model][required]',       "value": 'true'},
          { "selector": 'input[type=text][ng-model]', "value": 'val'}
        ]);
  });

  it('should match two directives', () => {
    expect(
      selector.match(e('<input type="text" my-model="val" required my-required />')))
        .toEqualsDirectiveInfos([
          { "selector": '[my-model][required]',    "value": ''},
          { "selector": '[my-model][my-required]', "value": ''}
        ]);
  });

  it('should match an two directives with the same selector', () => {
    expect(selector.match(e('<div two-directives></div>')))
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
              var binder = actual.decorators[i];
              var directiveClass = binder.directiveClass;
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
  var directives = [
    createDirectiveClass(_BElement),
    createDirectiveClass(_BClass),
    createDirectiveClass(_DirectiveAttr),
    createDirectiveClass(_WildcardDirectiveAttr),
    createDirectiveClass(_DirectiveFooAttr),
    createDirectiveClass(_BElementDirectiveAttr),
    createDirectiveClass(_DirectiveValueAttr),
    createDirectiveClass(_BElementDirectiveValue),
    createDirectiveClass(_ContainsAbc),
    createDirectiveClass(_AttributeContainsXyz),
    createDirectiveClass(_Component),
    createDirectiveClass(_Attribute),
    createDirectiveClass(_Structural),
    createDirectiveClass(_IgnoreChildren),
    createDirectiveClass(_TwoDirectives),
    createDirectiveClass(_OneOfTwoDirectives),
    createDirectiveClass(_TwoOfTwoDirectives)
  ];

  var directiveClassSet = DirectiveClassSet(null, directives);

  return directiveClassSet.selector();
}

function createDirectiveClass(directive){
  if (!directive.annotations || !directive.annotations.length) {
    throw new Error(`Missing directive annotation for ${directive}`);
  }

  var annotations = directive.annotations;

  for (var annotation of annotations) {
    if (annotation instanceof Directive) {
      return new DirectiveClass(annotation, directive);
    }
  }

  return null;
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

@Directive({selector:'b'})                        class _BElement{}
@Directive({selector:'.b'})                       class _BClass{}
@Directive({selector:'[directive]'})              class _DirectiveAttr{}
@Directive({selector:'[wildcard-*]'})             class _WildcardDirectiveAttr{}
@Directive({selector:'[directive=d][foo=f]'})     class _DirectiveFooAttr{}
@Directive({selector:'b[directive]'})             class _BElementDirectiveAttr{}
@Directive({selector:'[directive=value]'})        class _DirectiveValueAttr{}
@Directive({selector:'b[directive=value]'})       class _BElementDirectiveValue{}
@Directive({selector:':contains(/abc/)'})         class _ContainsAbc{}
@Directive({selector:'[*=/xyz/]'})                class _AttributeContainsXyz{}
@Directive({selector:'component'})                class _Component{}
@Directive({selector:'[attribute]'})              class _Attribute{}
@Directive({selector:'[structural]',
             //children: NgAnnotation.TRANSCLUDE_CHILDREN
           })
                                                  class _Structural{}

@Directive({selector:'[ignore-children]',
             //children: NgAnnotation.IGNORE_CHILDREN
           })
                                                  class _IgnoreChildren{}

@Directive({selector: '[my-model][required]'})
@Directive({selector: '[my-model][my-required]'}) class _TwoDirectives {}
@Directive({selector: '[two-directives]'})        class _OneOfTwoDirectives {}
@Directive({selector: '[two-directives]'})        class _TwoOfTwoDirectives {}
