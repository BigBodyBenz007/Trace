// Jest's usual CommonJS transform hides the production Babel/webpack mismatch.
// Exercise the browser caller explicitly so a helper import cannot silently
// turn these shared Node/browser modules into ESM while retaining module.exports.
const fs = require('node:fs');
const path = require('node:path');
const babel = require('@babel/core');

test.each(['additiveNameReference.js', 'nutritionAssessmentInputs.js'])(
  '%s retains CommonJS exports under the production browser transform', file => {
    const filename = path.join(__dirname, file);
    const source = fs.readFileSync(filename, 'utf8');
    const previousBabel = process.env.BABEL_ENV;
    const previousNode = process.env.NODE_ENV;
    let result;
    try {
      process.env.BABEL_ENV = 'production';
      process.env.NODE_ENV = 'production';
      result = babel.transformSync(source, {
        filename, envName: 'production', babelrc: false, configFile: false, ast: true,
        caller: { name: 'babel-loader', supportsStaticESM: true, supportsDynamicImport: true },
        presets: [[require.resolve('babel-preset-react-app'), { runtime: 'automatic' }]],
      });
    } finally {
      if (previousBabel === undefined) delete process.env.BABEL_ENV;
      else process.env.BABEL_ENV = previousBabel;
      process.env.NODE_ENV = previousNode;
    }
    expect(source).toContain('module.exports');
    expect(result.ast.program.body.filter(node => /^(Import|Export)/.test(node.type))).toEqual([]);
  },
);
