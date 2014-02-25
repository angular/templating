// See https://github.com/angular/di.js/blob/master/example/testing/coffee.spec.js
import {use, inject} from 'di/testing';
import {IncredibleCalculator as Calculator} from '../src/some';


describe('something', () => {

  it('should work', inject(Calculator, (calculator) => {
    expect(calculator.sum(1, 1)).toBe(2);
    expect(calculator.sum(1, 2)).toBe(3);
  }));


  it('should type check', inject(Calculator, (calculator) => {
    expect(() => calculator.sum('invalid', false))
      .toThrowError('Invalid arguments given!\n' +
                    '  - 1st argument has to be an instance of number, got "invalid"\n' +
                    '  - 2nd argument has to be an instance of number, got false');
  }));
});
