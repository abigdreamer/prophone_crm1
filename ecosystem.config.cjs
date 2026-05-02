module.exports = {
  apps: [
    {
      name: 'prophone-server',
      script: 'src/app.js',
      cwd: './server',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env_production: {
        NODE_ENV: 'production',
        PORT: 8080,
      },
    },
  ],
};
