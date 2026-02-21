const express = require("express");
const cors = require("cors");
const path = require("path");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);  // wrap express in an http server for socket.io

// Attach socket.io to our http server
const io = new Server(server, {
    cors: { origin: "*" }
});

app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.static(path.join(__dirname, "safe-buddy", "public"), { index: "verify.html" }));

// ─── In-memory storage (fast for hackathon demo) ──────────────────────────────
let travelRequests = [];
let verifiedUsers = [];
let messages = [];

// Maps username → socket.id (so we can send messages directly to them)
const onlineUsers = {};

// ─── SOCKET.IO: Real-time messaging ───────────────────────────────────────────
io.on("connection", (socket) => {
    console.log("🔌 User connected:", socket.id);

    // When a user identifies themselves, save their socket id
    socket.on("register", (username) => {
        onlineUsers[username] = socket.id;
        console.log(`👤 ${username} registered (socket: ${socket.id})`);
    });

    // When a user sends a message
    socket.on("send-message", (data) => {
        const { from, to, message } = data;
        if (!from || !to || !message) return;

        const msg = { from, to, message, timestamp: new Date().toISOString() };
        messages.push(msg);

        // Send to recipient if they are online right now
        const recipientSocket = onlineUsers[to];
        if (recipientSocket) {
            io.to(recipientSocket).emit("new-message", msg);
        }

        // Also confirm delivery to sender
        socket.emit("message-sent", msg);

        // ─── AUTO-REPLY FEATURE FOR DEMO ───
        // Wait 1.5 seconds, then the buddy auto-replies to you
        setTimeout(() => {
            const autoReplies = [
                "Hey! Yes, I'm looking for a buddy too. 🚕",
                "That sounds great! Where exactly should we meet?",
                "Perfect! I'll be there on time.",
                "Awesome, let's share a cab together! ✨",
                "Hello! Yes, that route and time works for me."
            ];
            const randomReply = autoReplies[Math.floor(Math.random() * autoReplies.length)];

            const replyMsg = {
                from: to,
                to: from,
                message: randomReply,
                timestamp: new Date().toISOString()
            };

            messages.push(replyMsg);

            // Send the auto-reply back to the sender
            socket.emit("new-message", replyMsg);

            // If the recipient is actually online, update their chat window too
            if (recipientSocket) {
                io.to(recipientSocket).emit("message-sent", replyMsg);
            }
        }, 1500);
    });

    // When user disconnects, remove them from online list
    socket.on("disconnect", () => {
        for (const [username, sid] of Object.entries(onlineUsers)) {
            if (sid === socket.id) {
                delete onlineUsers[username];
                console.log(`👋 ${username} disconnected`);
                break;
            }
        }
    });
});

// ─── REST API: Travel matching ─────────────────────────────────────────────────
app.post("/add", (req, res) => {
    const user = req.body;
    if (!user.name || !user.start || !user.destination || !user.time) {
        return res.json({ success: false, message: "Fill all fields" });
    }
    travelRequests.push(user);
    res.json({ success: true });
});

app.post("/match", (req, res) => {
    const { start, destination, time, name } = req.body;

    // Strict matching for real users
    const matches = travelRequests.filter(u =>
        u.name !== name &&
        u.start.toLowerCase() === start.toLowerCase() &&
        u.destination.toLowerCase() === destination.toLowerCase() &&
        u.time.toLowerCase() === time.toLowerCase()
    );

    // 🪄 MAGIC TRICK FOR DEMO 🪄
    // Always instantly generate a buddy going to your exact location so you can show the texting feature!
    const names = ["Priya", "Sneha", "Riya", "Ananya", "Diya", "Bhavana", "Kavya"];
    const randomName = names[Math.floor(Math.random() * names.length)];

    const demoBuddy = {
        name: randomName,
        start: start,
        destination: destination,
        time: time
    };
    matches.unshift(demoBuddy);

    res.json(matches);
});

// ─── REST API: Verification ────────────────────────────────────────────────────
app.post("/verify", (req, res) => {
    const { name, contact, idImage, selfieImage } = req.body;

    if (!name || !contact || !idImage || !selfieImage) {
        return res.json({ success: false, message: "Please fill all fields and upload both ID and selfie" });
    }

    verifiedUsers.push({ name, contact, idImage, selfieImage, verifiedAt: new Date() });
    res.json({ success: true, message: "✅ Identity verified successfully! You can now use the app." });
});

// ─── REST API: Get message history ────────────────────────────────────────────
app.get("/messages/:user", (req, res) => {
    const { user } = req.params;
    const since = req.query.since ? new Date(req.query.since) : null;

    let userMessages = messages.filter(m => m.to === user || m.from === user);
    if (since) {
        userMessages = userMessages.filter(m => new Date(m.timestamp) > since);
    }

    res.json(userMessages);
});

// ─── REST API: Get contact info ────────────────────────────────────────────────
app.get("/contact/:name", (req, res) => {
    const { name } = req.params;
    const user = verifiedUsers.find(u => u.name === name);

    if (!user) return res.json({ success: false, message: "User not found or not verified" });
    res.json({ success: true, contact: user.contact });
});

// ─── REST API: Check who's online ─────────────────────────────────────────────
app.get("/online", (req, res) => {
    res.json(Object.keys(onlineUsers));
});

// ─── Start ─────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`✅ Server running! Open http://localhost:${PORT} in your browser`);
    console.log("⚡ WebSocket (socket.io) messaging is active");
});