const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(__dirname));

// Database file path
const DB_FILE = path.join(__dirname, 'locations.json');

// Initialize database if it doesn't exist
if (!fs.existsSync(DB_FILE)) {
  fs.writeFileSync(DB_FILE, JSON.stringify({ users: [] }, null, 2));
}

// Helper function to read database
function readDB() {
  try {
    const data = fs.readFileSync(DB_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return { users: [] };
  }
}

// Helper function to write database
function writeDB(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

// API Routes

// Get all tracked users
app.get('/api/users', (req, res) => {
  const db = readDB();
  res.json(db.users);
});

// Get specific user by Instagram ID
app.get('/api/users/:instagramId', (req, res) => {
  const db = readDB();
  const user = db.users.find(u => u.instagramId === req.params.instagramId);
  
  if (user) {
    res.json(user);
  } else {
    res.status(404).json({ error: 'User not found' });
  }
});

// Add or update user location
app.post('/api/location', (req, res) => {
  const { instagramId, latitude, longitude, accuracy, timestamp } = req.body;
  
  if (!instagramId || !latitude || !longitude) {
    return res.status(400).json({ error: 'Missing required fields: instagramId, latitude, longitude' });
  }
  
  const db = readDB();
  const userIndex = db.users.findIndex(u => u.instagramId === instagramId);
  
  const locationData = {
    latitude: parseFloat(latitude),
    longitude: parseFloat(longitude),
    accuracy: accuracy || null,
    timestamp: timestamp || new Date().toISOString(),
    lastUpdated: new Date().toISOString()
  };
  
  if (userIndex !== -1) {
    // Update existing user
    db.users[userIndex].locations.push(locationData);
    db.users[userIndex].currentLocation = locationData;
    db.users[userIndex].lastSeen = new Date().toISOString();
  } else {
    // Add new user
    db.users.push({
      instagramId,
      locations: [locationData],
      currentLocation: locationData,
      firstSeen: new Date().toISOString(),
      lastSeen: new Date().toISOString()
    });
  }
  
  writeDB(db);
  res.json({ success: true, message: 'Location updated successfully' });
});

// Get location history for a user
app.get('/api/history/:instagramId', (req, res) => {
  const db = readDB();
  const user = db.users.find(u => u.instagramId === req.params.instagramId);
  
  if (user) {
    res.json(user.locations);
  } else {
    res.status(404).json({ error: 'User not found' });
  }
});

// Delete user data
app.delete('/api/users/:instagramId', (req, res) => {
  const db = readDB();
  const userIndex = db.users.findIndex(u => u.instagramId === req.params.instagramId);
  
  if (userIndex !== -1) {
    db.users.splice(userIndex, 1);
    writeDB(db);
    res.json({ success: true, message: 'User deleted successfully' });
  } else {
    res.status(404).json({ error: 'User not found' });
  }
});

// Clear all data
app.delete('/api/clear', (req, res) => {
  writeDB({ users: [] });
  res.json({ success: true, message: 'All data cleared' });
});

// Get server statistics
app.get('/api/stats', (req, res) => {
  const db = readDB();
  res.json({
    totalUsers: db.users.length,
    totalLocations: db.users.reduce((sum, user) => sum + user.locations.length, 0),
    activeUsers: db.users.filter(u => {
      const lastSeen = new Date(u.lastSeen);
      const now = new Date();
      return (now - lastSeen) < 3600000; // Active in last hour
    }).length
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Instagram Location Tracker Server running on http://localhost:${PORT}`);
  console.log(`📍 API Endpoints:`);
  console.log(`   GET  /api/users - Get all tracked users`);
  console.log(`   GET  /api/users/:instagramId - Get specific user`);
  console.log(`   POST /api/location - Update user location`);
  console.log(`   GET  /api/history/:instagramId - Get location history`);
  console.log(`   DELETE /api/users/:instagramId - Delete user`);
  console.log(`   GET  /api/stats - Get server statistics`);
});
