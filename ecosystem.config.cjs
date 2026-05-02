const path = require('path');
const root  = __dirname;

module.exports = {
  apps: [
    {
      name:                 'prophone',
      script:               path.join(root, 'server/src/app.js'),
      cwd:                  path.join(root, 'server'),
      instances:            1,
      autorestart:          true,
      watch:                false,
      max_memory_restart:   '500M',
      env_production: {
        NODE_ENV: 'production',
        PORT:     8080,
      },
    },
  ],
};
