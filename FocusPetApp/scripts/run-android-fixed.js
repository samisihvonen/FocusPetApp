const { spawn } = require('child_process');
const { buildEnv } = require('./common-env');

const env = buildEnv();
const extraArgs = process.argv.slice(2).join(' ');
const command = `npx react-native run-android --port 8082 ${extraArgs}`.trim();

const child = spawn(command, {
  stdio: 'inherit',
  env,
  shell: true,
});

child.on('exit', code => {
  process.exit(code ?? 1);
});

child.on('error', err => {
  console.error('[android:fixed] Failed to start:', err.message);
  process.exit(1);
});
