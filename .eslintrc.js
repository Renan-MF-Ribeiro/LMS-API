module.exports = {
  root: true,

  env: {
    es6: true,
    node: true,
  },

  parserOptions: {
    ecmaVersion: 2019,
  },

  extends: ['standard'],

  rules: {
    semi: ['always', 'error'],
    'no-console': process.env.NODE_ENV === 'production' ? 'error' : 'warn',
    'no-debugger': process.env.NODE_ENV === 'production' ? 'error' : 'warn',
    'camelcase': 'off',

    indent: ['error', 4, {
      SwitchCase: 1,
      VariableDeclarator: 1,
      outerIIFEBody: 1,
      MemberExpression: 1,
      FunctionDeclaration: { parameters: 1, body: 1 },
      FunctionExpression: { parameters: 1, body: 1 },
      CallExpression: { arguments: 1 },
      ArrayExpression: 1,
      ObjectExpression: 1,
      ImportDeclaration: 1,
      flatTernaryExpressions: false,
      ignoreComments: false,
      ignoredNodes: ['TemplateLiteral *']
    }],

    'arrow-parens': ['error', 'as-needed'],

    'comma-dangle': [
      'error',
      {
        arrays: 'always-multiline',
        objects: 'always-multiline',
        imports: 'always-multiline',
        exports: 'always-multiline',
        functions: 'always-multiline',
      },
    ],

    'object-property-newline': [
      'error',
      { allowMultiplePropertiesPerLine: true },
    ],
  },
}
