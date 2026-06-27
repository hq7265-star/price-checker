require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cron = require('node-cron');
const { initDatabase } = require('./models/init');
const { runFetchJob } = require('./jobs/fetchDeals');
const dealsRouter = require('./routes/deals');
const watchlistRouter = require('./routes/watchlist');
const settingsRouter = require('./routes/settings');
const colesRouter = require('./routes/coles');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.use('/api/deals', dealsRouter);
app.use('/api/watchlist', watchlistRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/coles', colesRouter);

async function start() {
  await initDatabase();

  // Fetch deals every 30 minutes
  cron.schedule('*/30 * * * *', runFetchJob);

  // Fetch once on startup
  runFetchJob();

  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

start().catch(console.error);
