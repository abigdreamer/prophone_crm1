// PM2 ecosystem — keeps process definitions in one place so restart.sh
// always starts both processes with the correct flags.
module.exports = {
  apps: [
    {
      name:   'prophone-server',
      script: 'server/index.js',
      env: {
        NODE_ENV: 'production',
        PORT:     8080,
      },
      watch:    false,
      autorestart: true,
    },
    {
      name:   'prophone-client',
      script: 'npx',
      args:   'serve -s client/dist -l 3000',
      // -s (--single) = SPA mode: all 404s redirect to index.html
      // This is what fixes /login, /dashboard, etc. returning 404 on direct access.
      watch:    false,
      autorestart: true,
    },
  ],
};
