module.exports = {
  apps: [{
    name: "shreerath-app",
    script: "./dist/index.cjs",
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: "1G",
    env: {
      NODE_ENV: "production",
      PORT: 3005,
      MONGODB_URI: "mongodb+srv://Mrunali:Mrunalifeedback@feedbackqrform.fbhwhe8.mongodb.net/shreerathqr?appName=feedbackqrform",
      SESSION_SECRET: "shree-rath-secret"
    }
  }]
};