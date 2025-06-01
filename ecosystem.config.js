module.exports = {
  apps: [
    {
      name: "locus-back",
      script: "./dist/app.js",
      instances: "max",
      exec_mode: "cluster",
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      env: {
        NODE_ENV: "production",
        PORT: 7001,
        CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
        CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
        CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET,
      },
      error_file: "./logs/error.log",
      out_file: "./logs/out.log",
      restart_delay: 1000,
      kill_timeout: 3000,
      cwd: "/var/www/locus-back"
    },
  ],
}; 