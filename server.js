// This is the final server.js with WebSocket for live user count
const express = require('express');
const cors = require('cors');
const http = require('http'); // We need the http module
const WebSocket = require('ws'); // The new WebSocket library
const mongoose = require("mongoose");

mongoose.connect("mongodb://host.docker.internal:27017/dashboard");

const MetricSchema = new mongoose.Schema({
  cpu: String,
  memory: String,
  disk: String,
  uptime: String,
  time: { type: Date, default: Date.now }
});

const Metric = mongoose.model("Metric", MetricSchema);

const app = express();
const port = 3000;

let metricsHistory = [];

app.use(cors());
app.use(express.json());

// --- Standard API routes ---
app.get("/history", async (req, res) => {
  const data = await Metric.find().sort({ time: -1 }).limit(20);
  res.json(data);
});

app.post('/submit-metric', async (req, res) => {

  const data = req.body;

  // ✅ SAVE DATA INTO MONGODB
  await Metric.create({
    cpu: data.cpu,
    memory: data.memory,
    disk: data.disk,
    uptime: data.uptime
  });

  // ✅ Store in array (for dashboard)
  metricsHistory.unshift(data);

  if (metricsHistory.length > 20) {
    metricsHistory.pop();
  }

  // ✅ Send to dashboard (WebSocket)
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({
        type: "metrics",
        data: data
      }));
    }
  });

  res.status(200).send({ message: "Data received" });
});

// --- Create an HTTP server from our Express app ---
const server = http.createServer(app);

// --- NEW: WebSocket Server Logic ---
const wss = new WebSocket.Server({ server });

wss.on('connection', ws => {
    console.log('Client connected. Total clients:', wss.clients.size);
    broadcastUserCount();

    ws.on('close', () => {
        console.log('Client disconnected. Total clients:', wss.clients.size);
        broadcastUserCount();
    });

    ws.on('error', error => {
        console.error('WebSocket error:', error);
    });
});

function broadcastUserCount() {
    // Send the current number of connected clients to everyone
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ type: 'userCount', count: wss.clients.size }));
        }
    });
}

// --- Start the server ---
server.listen(port, () => {
  console.log(`HTTP and WebSocket server listening at http://localhost:${port}`);
});