const { spawn } = require('child_process');
const net = require('net');
const { buildEnv } = require('./common-env');

const env = buildEnv();
const extraArgs = process.argv.slice(2).join(' ');
const command = `npx react-native start --port 8082 --reset-cache ${extraArgs}`.trim();

function isPortInUse(port) {
  return new Promise(resolve => {
    const socket = net.createConnection({ port, host: '127.0.0.1' });
    socket.setTimeout(500);
    socket.once('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.once('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    socket.once('error', err => {
      if (err.code === 'ECONNREFUSED') {
        resolve(false);
        return;
      }
      resolve(true);
    });
  });
}

(async () => {
  const inUse = await isPortInUse(8082);
  if (inUse) {
    console.log('[start:fixed] Metro is already running on port 8082.');
    process.exit(0);
  }

  const child = spawn(command, {
    stdio: 'inherit',
    env,
    shell: true,
  });

  child.on('exit', code => {
    process.exit(code ?? 1);
  });

  child.on('error', err => {
    console.error('[start:fixed] Failed to start Metro:', err.message);
    process.exit(1);
  });
})();
