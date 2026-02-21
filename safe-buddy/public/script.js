// ===== SAFE TRAVEL BUDDY FINDER =====
// Uses Socket.IO for instant real-time messaging (no polling needed!)

// ─── Socket.IO connection (loaded from server via CDN in index.html) ──────────
const socket = io();

let currentChatWith = "";
let currentUserName = "";

// ─── Register this user with the server once we know their name ───────────────
function registerUser(name) {
    if (name) {
        socket.emit("register", name);
        console.log("Registered as:", name);
    }
}

// ─── When we receive a new message from our buddy ─────────────────────────────
socket.on("new-message", (msg) => {
    // Only show if chat with that person is open
    if (msg.from === currentChatWith) {
        appendMessage(msg, false);
        playPing();
    } else {
        // Show a subtle banner if chat with someone else is open
        showToast(`💬 New message from ${msg.from}`);
    }
});

// Confirm our own message was received by the server
socket.on("message-sent", (msg) => {
    appendMessage(msg, true);
});

// ─── FIND BUDDY ───────────────────────────────────────────────────────────────
async function addUser() {
    const name = document.getElementById("name").value.trim();
    const start = document.getElementById("start").value.trim();
    const destination = document.getElementById("destination").value.trim();
    const time = document.getElementById("time").value.trim();
    const status = document.getElementById("findStatus");

    if (!name || !start || !destination || !time) {
        status.innerText = "⚠️ Please fill in all fields first!";
        status.style.color = "#e53935";
        return;
    }

    // Register this user with socket.io so they can receive messages
    currentUserName = name;
    registerUser(name);

    status.innerText = "🔍 Searching for buddies...";
    status.style.color = "#d63384";

    try {
        await fetch("/add", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, start, destination, time })
        });

        await findMatches({ name, start, destination, time });

    } catch (err) {
        status.innerText = "❌ Could not connect to server. Make sure server is running!";
        status.style.color = "#e53935";
        console.error(err);
    }
}

// ─── SHOW MATCHES ─────────────────────────────────────────────────────────────
async function findMatches(user) {
    const status = document.getElementById("findStatus");

    try {
        const res = await fetch("/match", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(user)
        });

        const matches = await res.json();
        const list = document.getElementById("matches");
        const matchSection = document.getElementById("matchSection");

        list.innerHTML = "";

        if (matches.length === 0) {
            status.innerText = "😔 No buddies found for this route yet. Your request is saved — someone might join soon!";
            matchSection.style.display = "none";
            return;
        }

        status.innerText = `🎉 ${matches.length} buddy(ies) found!`;
        matchSection.style.display = "block";

        matches.forEach(m => {
            if (m.name === user.name) return; // Don't show yourself

            const li = document.createElement("li");
            li.innerHTML = `
                <div>
                    <strong>👩 ${m.name}</strong><br>
                    <small>📍 ${m.start} → ${m.destination}</small><br>
                    <small>🕐 ${m.time}</small>
                </div>
                <button class="msg-btn" onclick="openChat('${m.name}')">💬 Message</button>
            `;
            list.appendChild(li);
        });

    } catch (err) {
        document.getElementById("findStatus").innerText = "❌ Error finding matches!";
        console.error(err);
    }
}

// ─── CHAT: Open ───────────────────────────────────────────────────────────────
async function openChat(name) {
    // 🛡️ Safety Feature: Block chat if user hasn't verified
    const isVerified = localStorage.getItem("travelBuddyVerified");
    if (isVerified !== "true") {
        alert("🛡️ Safety First! You must complete Identity Verification before you can chat with buddies.");
        window.location.href = "verify.html";
        return;
    }

    currentChatWith = name;
    if (!currentUserName) {
        currentUserName = document.getElementById("name").value.trim() || "You";
        registerUser(currentUserName);
    }

    // Try to get contact number
    try {
        const res = await fetch(`/contact/${name}`);
        const data = await res.json();
        document.getElementById("contactDisplay").innerText = data.success
            ? `📞 ${name}'s contact: ${data.contact}`
            : `${name} hasn't verified yet`;
    } catch {
        document.getElementById("contactDisplay").innerText = "";
    }

    document.getElementById("chatModal").style.display = "flex";
    document.getElementById("chatName").innerText = `💬 Chat with ${name}`;
    document.getElementById("messageInput").value = "";

    // Load message history from server (REST)
    await loadMessageHistory();
    document.getElementById("messageInput").focus();
}

// ─── CHAT: Close ──────────────────────────────────────────────────────────────
function closeChat() {
    document.getElementById("chatModal").style.display = "none";
    currentChatWith = "";
}

// ─── CHAT: Load history from server ───────────────────────────────────────────
async function loadMessageHistory() {
    if (!currentUserName || !currentChatWith) return;

    try {
        const res = await fetch(`/messages/${currentUserName}`);
        const msgs = await res.json();
        const msgDiv = document.getElementById("messages");
        msgDiv.innerHTML = "";

        const convo = msgs.filter(m =>
            (m.from === currentUserName && m.to === currentChatWith) ||
            (m.from === currentChatWith && m.to === currentUserName)
        );

        if (convo.length === 0) {
            msgDiv.innerHTML = `<p style="color:#aaa;text-align:center;margin-top:20px;">No messages yet. Say hi! 👋</p>`;
            return;
        }

        convo.forEach(m => appendMessage(m, m.from === currentUserName));
        msgDiv.scrollTop = msgDiv.scrollHeight;

    } catch (err) {
        console.error("Error loading messages:", err);
    }
}

// ─── CHAT: Append a single message bubble ─────────────────────────────────────
function appendMessage(m, isMine) {
    const msgDiv = document.getElementById("messages");

    // Remove "no messages" placeholder
    const placeholder = msgDiv.querySelector("p");
    if (placeholder) msgDiv.innerHTML = "";

    const wrapper = document.createElement("div");
    wrapper.style.cssText = `
        display: flex;
        flex-direction: column;
        align-items: ${isMine ? "flex-end" : "flex-start"};
        margin: 6px 0;
    `;

    const bubble = document.createElement("div");
    bubble.style.cssText = `
        padding: 9px 13px;
        border-radius: ${isMine ? "12px 12px 2px 12px" : "12px 12px 12px 2px"};
        max-width: 75%;
        background: ${isMine ? "linear-gradient(135deg, #ff4da6, #d63384)" : "#f0f0f0"};
        color: ${isMine ? "white" : "#333"};
        font-size: 14px;
        word-wrap: break-word;
    `;
    bubble.innerText = m.message;

    const timeEl = document.createElement("small");
    timeEl.style.cssText = "color:#aaa;font-size:11px;margin-top:2px;";
    const t = new Date(m.timestamp);
    timeEl.innerText = t.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    wrapper.appendChild(bubble);
    wrapper.appendChild(timeEl);
    msgDiv.appendChild(wrapper);
    msgDiv.scrollTop = msgDiv.scrollHeight;
}

// ─── CHAT: Send a message via WebSocket ───────────────────────────────────────
function sendMsg() {
    const messageText = document.getElementById("messageInput").value.trim();
    if (!messageText || !currentChatWith) return;

    // Send instantly via socket — no need to wait for HTTP response
    socket.emit("send-message", {
        from: currentUserName,
        to: currentChatWith,
        message: messageText
    });

    document.getElementById("messageInput").value = "";
}

// Allow pressing Enter to send
document.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && currentChatWith) sendMsg();
});

// ─── Notification ping sound ──────────────────────────────────────────────────
function playPing() {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = "sine";
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.3);
    } catch (e) { /* silent fail */ }
}

// ─── Toast notification for messages when chat is not open ────────────────────
function showToast(text) {
    let toast = document.getElementById("toast");
    if (!toast) {
        toast = document.createElement("div");
        toast.id = "toast";
        toast.style.cssText = `
            position: fixed;
            bottom: 24px;
            left: 50%;
            transform: translateX(-50%);
            background: #d63384;
            color: white;
            padding: 12px 24px;
            border-radius: 24px;
            font-size: 14px;
            font-weight: bold;
            z-index: 9999;
            box-shadow: 0 4px 16px rgba(214,51,132,0.4);
            transition: opacity 0.3s;
        `;
        document.body.appendChild(toast);
    }
    toast.innerText = text;
    toast.style.opacity = "1";
    clearTimeout(toast._timeout);
    toast._timeout = setTimeout(() => toast.style.opacity = "0", 3000);
}