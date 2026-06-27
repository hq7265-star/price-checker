const { execFile } = require('child_process');
const path = require('path');

const WORKER_PATH = path.join(__dirname, 'coles-worker.js');

function searchColes(query) {
  return new Promise((resolve, reject) => {
    execFile('node', [WORKER_PATH, query], { timeout: 60000 }, (err, stdout, stderr) => {
      if (err) {
        console.error('Coles worker error:', stderr || err.message);
        return resolve([]);
      }

      try {
        const products = JSON.parse(stdout.trim());
        resolve(products);
      } catch (parseErr) {
        console.error('Coles parse error:', parseErr.message);
        resolve([]);
      }
    });
  });
}

module.exports = { searchColes };
