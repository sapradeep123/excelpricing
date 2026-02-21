module.exports = {
  apps: [{
    name: 'pricing-calculator',
    script: './dist/index.cjs',
    cwd: '/root/pricing',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: 5000,
      DATABASE_URL: 'postgresql://calculator_user:safePassword123@localhost:5433/calculator',
      WEBBER_STOP_ADMIN_API_KEY: 'a0d9e098-8770-4ebc-8c19-b235bbeafe50|F0rvmob5ZLStO3XZOYDFLJcPx0CeFzpsxKk2bC9s8a83169c',
      LOG_LEVEL: 'info',
      SESSION_SECRET: 'your_session_secret_here'
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    max_memory_restart: '500M',
    exp_backoff_restart_delay: 100
  }]
};
