const express = require("express");
const http = require("http");
const cors = require("cors");
const { ExpressPeerServer } = require("peer");
const { MongoClient, ObjectId } = require("mongodb");

const app = express();
const server = http.createServer(app);

app.use(cors());
app.use(express.json());

// In-memory store for random matchmaking (demo only, not production safe)
let randomPeers = new Set();

// Endpoint to register random peer
app.post("/random/register", (req, res) => {
  const { peerId } = req.body;
  if (!peerId) return res.status(400).json({ error: "Peer ID required" });
  randomPeers.add(peerId);
  return res.json({ success: true });
});

// Endpoint to get a random online peer (excluding self)
app.get("/random/match", (req, res) => {
  const { peerId } = req.query;
  const available = Array.from(randomPeers).filter(id => id !== peerId);
  if (available.length === 0) return res.json({ peerId: null });
  const randomPeer = available[Math.floor(Math.random() * available.length)];
  return res.json({ peerId: randomPeer });
});

// Endpoint to remove peer from random pool (on disconnect)
app.post("/random/unregister", (req, res) => {
  const { peerId } = req.body;
  randomPeers.delete(peerId);
  return res.json({ success: true });
});



// MongoDB Atlas connection
require('dotenv').config();
const MONGO_URI = process.env.MONGO_URI;
const client = new MongoClient(MONGO_URI);
let usersCollection;

async function connectMongo() {
  try {
    await client.connect();
    const db = client.db();
    usersCollection = db.collection("users");
    console.log("Connected to MongoDB Atlas");
  } catch (err) {
    console.error("MongoDB connection error:", err);
  }
}
connectMongo();

// User registration endpoint
app.post("/register", async (req, res) => {
  const { username } = req.body;
  if (!username) return res.status(400).json({ error: "Username required" });
  try {
    // Check if username exists
    const existing = await usersCollection.findOne({ username });
    if (existing) return res.json({ peerId: existing.peerId });
    // Generate permanent peerId
    const peerId = new ObjectId().toString();
    await usersCollection.insertOne({ username, peerId });
    return res.json({ peerId });
  } catch (err) {
    return res.status(500).json({ error: "Registration failed" });
  }
});

// ✅ Mount PeerJS CORRECTLY
const peerServer = ExpressPeerServer(server, {
  debug: true,
});

app.use("/peerjs", peerServer);

app.get("/", (req, res) => {
  res.send("PeerJS Backend Running 🚀");
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
