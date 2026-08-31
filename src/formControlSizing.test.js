import fs from 'fs';
import path from 'path';

const css = fs.readFileSync(path.join(__dirname, 'index.css'), 'utf8');

const getRule = (selector) => {
  const selectorIndex = css.indexOf(selector);
  const ruleStart = css.indexOf('{', selectorIndex);
  const ruleEnd = css.indexOf('}', ruleStart);

  expect(selectorIndex).toBeGreaterThanOrEqual(0);
  expect(ruleStart).toBeGreaterThan(selectorIndex);
  expect(ruleEnd).toBeGreaterThan(ruleStart);

  return css.slice(selectorIndex, ruleEnd + 1);
};

describe('shared feature-page form-control sizing', () => {
  test('keeps standard controls inside their available inline space', () => {
    const rule = getRule(
      '.trace-feature-page input:not([type="checkbox"]):not([type="radio"]):not([type="file"]),'
    );

    expect(rule).toMatch(/box-sizing:\s*border-box;/);
    expect(rule).toMatch(/display:\s*block;/);
    expect(rule).toMatch(/inline-size:\s*100%;/);
    expect(rule).toMatch(/max-inline-size:\s*100%;/);
    expect(rule).toMatch(/max-width:\s*100%;/);
    expect(rule).toMatch(/min-inline-size:\s*0;/);
    expect(rule).toMatch(/min-width:\s*0;/);
    expect(rule).toMatch(/width:\s*100%;/);
  });

  test('applies the iOS padding workaround to every native temporal input', () => {
    const rule = getRule('.trace-feature-page input[type="date"],');

    ['datetime-local', 'month', 'time', 'week'].forEach((type) => {
      expect(rule).toContain(`.trace-feature-page input[type="${type}"]`);
    });
    expect(rule).toMatch(/inline-size:\s*100%;/);
    expect(rule).toMatch(/max-inline-size:\s*100%;/);
    expect(rule).toMatch(/min-inline-size:\s*0;/);
    expect(rule).toMatch(/padding-inline:\s*0\s*!important;/);
  });
});
