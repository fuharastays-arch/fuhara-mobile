const { withAppBuildGradle } = require('@expo/config-plugins');

const stagingLine = '            buildStagingDirectory file("C:/f/c")';

module.exports = function withWindowsCmakeShortPath(config) {
  if (process.platform !== 'win32') return config;

  return withAppBuildGradle(config, (modConfig) => {
    if (modConfig.modResults.language !== 'groovy') return modConfig;

    const source = modConfig.modResults.contents;
    if (source.includes(stagingLine)) return modConfig;

    const existingBlock = /\n    externalNativeBuild \{\n        cmake \{\n            buildStagingDirectory file\("[^"]+"\)\n        \}\n    \}\n/;
    if (existingBlock.test(source)) {
      modConfig.modResults.contents = source.replace(
        existingBlock,
        `\n    externalNativeBuild {\n        cmake {\n${stagingLine}\n        }\n    }\n`,
      );
      return modConfig;
    }

    const anchor = '    compileSdk rootProject.ext.compileSdkVersion\n';
    if (!source.includes(anchor)) {
      throw new Error('Unable to configure the short Windows CMake staging path.');
    }

    modConfig.modResults.contents = source.replace(
      anchor,
      `${anchor}\n    externalNativeBuild {\n        cmake {\n${stagingLine}\n        }\n    }\n`,
    );
    return modConfig;
  });
};
