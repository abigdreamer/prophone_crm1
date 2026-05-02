const path = require('path');
const root = __dirname;

module.exports = {
  apps: [
    {
      name: 'prophone-backend',
      script: path.join(root, 'server/src/app.js'),
      cwd: path.join(root, 'server'),
      instances: 1,
      autorestart: true,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
        PORT: 8080,
      },
    },
    {
      name: 'prophone-frontend',
      script: 'npx',
      args: 'serve -s build -l 3000',
      cwd: path.join(root, 'client'),
      autorestart: true,
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};