const env = require('./config/env');
env.validateEnv();

const connectDB = require('./config/db');
const app = require('./app');

const start = async () => {
  await connectDB();
  const { port } = env.get();
  app.listen(port, () => console.log(`AttendTrack API listening on port ${port}`));
};

start().catch((err) => {
  console.error('Failed to start server:', err.message);
  process.exit(1);
});
