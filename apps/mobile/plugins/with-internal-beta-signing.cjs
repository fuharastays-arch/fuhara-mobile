const { withAppBuildGradle } = require('@expo/config-plugins');

const propertiesMarker = '// FUHARA_INTERNAL_BETA_SIGNING_PROPERTIES';
const signingMarker = '// FUHARA_INTERNAL_BETA_SIGNING_CONFIG';

module.exports = function withInternalBetaSigning(config) {
  return withAppBuildGradle(config, (modConfig) => {
    if (modConfig.modResults.language !== 'groovy') return modConfig;

    let source = modConfig.modResults.contents;

    if (!source.includes(propertiesMarker)) {
      const pluginsAnchor = 'apply plugin: "com.facebook.react"\n';
      if (!source.includes(pluginsAnchor)) {
        throw new Error('Unable to configure Fuhara internal beta signing properties.');
      }
      source = source.replace(
        pluginsAnchor,
        `${pluginsAnchor}\n${propertiesMarker}\ndef fuharaKeystorePropertiesFile = rootProject.file("../.credentials/keystore.properties")\ndef fuharaKeystoreProperties = new Properties()\nif (fuharaKeystorePropertiesFile.exists()) {\n    fuharaKeystoreProperties.load(new FileInputStream(fuharaKeystorePropertiesFile))\n}\n`,
      );
    }

    if (!source.includes(signingMarker)) {
      const signingAnchor = '    signingConfigs {\n        debug {';
      if (!source.includes(signingAnchor)) {
        throw new Error('Unable to configure the Fuhara internal beta signing config.');
      }
      source = source.replace(
        signingAnchor,
        `    signingConfigs {\n        ${signingMarker}\n        release {\n            if (!fuharaKeystorePropertiesFile.exists()) {\n                throw new GradleException("Missing apps/mobile/.credentials/keystore.properties for the signed internal beta build.")\n            }\n            storeFile rootProject.file(fuharaKeystoreProperties['storeFile'])\n            storePassword fuharaKeystoreProperties['storePassword']\n            keyAlias fuharaKeystoreProperties['keyAlias']\n            keyPassword fuharaKeystoreProperties['keyPassword']\n        }\n        debug {`,
      );

      const debugReleaseLine = '            signingConfig signingConfigs.debug\n';
      const buildTypesIndex = source.indexOf('    buildTypes {');
      const releaseBlock = '        release {';
      const releaseIndex = source.indexOf(releaseBlock, buildTypesIndex);
      const debugSigningIndex = source.indexOf(debugReleaseLine, releaseIndex);
      if (buildTypesIndex === -1 || releaseIndex === -1 || debugSigningIndex === -1) {
        throw new Error('Unable to assign the Fuhara internal beta release signing config.');
      }
      source = `${source.slice(0, debugSigningIndex)}            signingConfig signingConfigs.release\n${source.slice(debugSigningIndex + debugReleaseLine.length)}`;
    }

    modConfig.modResults.contents = source;
    return modConfig;
  });
};
