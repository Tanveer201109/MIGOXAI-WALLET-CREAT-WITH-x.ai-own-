const express = require('express');
const fs = require('fs');
const path = require('path');

const appPublic = express();
const appAdmin = express();

appPublic.use(express.json());
appAdmin.use(express.json());
appPublic.use(express.static(__dirname));
appAdmin.use(express.static(__dirname));

// Data file
const DATA_FILE = path.join(__dirname, 'data.json');
let data = { users: [], submissions: [] };

if (fs.existsSync(DATA_FILE)) {
  data = JSON.parse(fs.readFileSync(DATA_FILE));
}

// Save data
function saveData() {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// ============ PUBLIC API (Port 3000) ============
appPublic.post('/api/connect', (req, res) => {
  const { username, platform } = req.body;
  let user = data.users.find(u => u.username === username);
  if (!user) {
    user = { username, platforms: [], balance: 0 };
    data.users.push(user);
  }
  if (!user.platforms.includes(platform)) {
    user.platforms.push(platform);
  }
  saveData();
  res.json({ success: true, user });
});

appPublic.post('/api/submit-bounty', (req, res) => {
  const { username, platform, proof } = req.body;
  data.submissions.push({
    id: Date.now(),
    username,
    platform,
    proof,
    status: "pending",
    time: new Date().toISOString()
  });
  saveData();
  res.json({ success: true, message: "Proof submitted" });
});

appPublic.get('/api/my-balance/:username', (req, res) => {
  const user = data.users.find(u => u.username === req.params.username);
  res.json(user || { balance: 0, platforms: [] });
});

// ============ ADMIN API (Port 3001) ============
appAdmin.get('/api/all-submissions', (req, res) => {
  res.json(data.submissions);
});

appAdmin.get('/api/platform-counts', (req, res) => {
  const counts = {};
  data.submissions.forEach(s => {
    counts[s.platform] = (counts[s.platform] || 0) + 1;
  });
  res.json(counts);
});

appAdmin.post('/api/approve/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const sub = data.submissions.find(s => s.id === id);
  if (sub && sub.status === "pending") {
    sub.status = "approved";
    let user = data.users.find(u => u.username === sub.username);
    if (user) {
      user.balance = (user.balance || 0) + 19;
    }
    saveData();
    res.json({ success: true });
  } else {
    res.json({ success: false });
  }
});

appAdmin.post('/api/distribute', (req, res) => {
  data.users.forEach(user => {
    if (user.platforms && user.platforms.length > 0) {
      user.balance = (user.balance || 0) + (user.platforms.length * 19);
    }
  });
  saveData();
  res.json({ success: true, message: "Tokens distributed" });
});

// Start servers
appPublic.listen(3000, () => {
  console.log('✅ Public Wallet running on http://localhost:3000');
});

appAdmin.listen(3001, () => {
  console.log('✅ Admin Wallet running on http://localhost:3001');
});
