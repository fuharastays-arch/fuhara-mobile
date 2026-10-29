const React = require('react');
const { View } = require('react-native');

const Icon = (props) => React.createElement(View, props);

module.exports = new Proxy(
  { __esModule: true, default: Icon },
  { get: (target, property) => target[property] || Icon },
);
