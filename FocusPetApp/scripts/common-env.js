const fs = require('fs');
const path = require('path');

const DEFAULT_JAVA_HOME = 'C:\\Program Files\\Android\\Android Studio\\jbr';

function getPreferredJavaHome() {
  const override = process.env.FOCUSPET_JAVA_HOME;
  if (override && fs.existsSync(override)) {
    return override;
  }

  if (fs.existsSync(DEFAULT_JAVA_HOME)) {
    return DEFAULT_JAVA_HOME;
  }

  return process.env.JAVA_HOME;
}

function buildEnv() {
  const env = { ...process.env };
  const javaHome = getPreferredJavaHome();

  if (!javaHome) {
    return env;
  }

  env.JAVA_HOME = javaHome;
  const javaBin = path.join(javaHome, 'bin');
  env.PATH = `${javaBin}${path.delimiter}${process.env.PATH || ''}`;

  return env;
}

function getNpxCommand() {
  return process.platform === 'win32' ? 'npx.cmd' : 'npx';
}

module.exports = {
  buildEnv,
  getNpxCommand,
};
