module.exports = {
  apps: [{
    name: 'locus-back',
    script: 'current/dist/app.js',
    cwd: '/var/www/locus-backend',
    interpreter: '/home/deploy/.nvm/versions/node/v22.11.0/bin/node',
    env_production: {
      NODE_ENV: 'production'
    },
    error_file: '/var/www/locus-backend/logs/error.log',
    out_file: '/var/www/locus-backend/logs/out.log',
    merge_logs: true,
    log_date_format: 'YYYY-MM-DD HH:mm Z'
  }]
}; 