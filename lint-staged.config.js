export default {
  'src/**/*.{ts,html,css}': [
    'eslint --fix',
    'prettier --write'
  ],
  '*.json': [
    'prettier --write'
  ]
};
