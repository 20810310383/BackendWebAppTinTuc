module.exports = {
  apps: [
    {
      name: "tintuc",
      script: "./src/server.js",
      interpreter: "./node_modules/.bin/babel-node", // Hỗ trợ ES6/Babel trực tiếp từ src
      exec_mode: "fork",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      env: {
        NODE_ENV: "development",
        PORT: 6969,
      },
      env_production: {
        NODE_ENV: "production",
        PORT: 8069,
      },
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      error_file: "./logs/err.log",
      out_file: "./logs/out.log",
      merge_logs: true,
    },
    {
      name: "tintuc-chat",
      script: "./src/chatServer.js",
      exec_mode: "fork",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "500M",
      env: {
        NODE_ENV: "development",
      },
      env_production: {
        NODE_ENV: "production",
      },
    },
  ],
};
