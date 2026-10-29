const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const mobileDir = path.resolve(__dirname, '..');
const keystoreDir = path.join(mobileDir, '.credentials');
const keystorePath = path.join(keystoreDir, 'fuhara-internal-beta.jks');
const propertiesPath = path.join(keystoreDir, 'keystore.properties');
const keytool = process.env.JAVA_HOME
  ? path.join(process.env.JAVA_HOME, 'bin', 'keytool.exe')
  : 'C:\\Program Files\\Android\\Android Studio\\jbr\\bin\\keytool.exe';

if (fs.existsSync(keystorePath) || fs.existsSync(propertiesPath)) {
  throw new Error('Internal beta signing files already exist; refusing to overwrite them.');
}

fs.mkdirSync(keystoreDir, { recursive: true });
const storePassword = crypto.randomBytes(32).toString('base64url');
const keyPassword = crypto.randomBytes(32).toString('base64url');
const alias = 'fuhara-internal-beta';

const result = spawnSync(keytool, [
  '-genkeypair',
  '-v',
  '-keystore', keystorePath,
  '-storetype', 'JKS',
  '-storepass', storePassword,
  '-keypass', keyPassword,
  '-alias', alias,
  '-keyalg', 'RSA',
  '-keysize', '4096',
  '-validity', '3650',
  '-dname', 'CN=Fuhara Internal Beta, OU=Internal Testing, O=Fuhara, L=Abuja, ST=FCT, C=NG',
], { encoding: 'utf8' });

if (result.status !== 0) {
  fs.rmSync(keystorePath, { force: true });
  throw new Error(`keytool failed (${result.status}).`);
}

fs.writeFileSync(
  propertiesPath,
  [
    'storeFile=../.credentials/fuhara-internal-beta.jks',
    `storePassword=${storePassword}`,
    `keyAlias=${alias}`,
    `keyPassword=${keyPassword}`,
    '',
  ].join('\n'),
  { encoding: 'utf8', flag: 'wx' },
);

console.log('Created local internal-beta signing material; secrets were not printed.');
