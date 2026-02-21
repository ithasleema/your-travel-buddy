// ===== VERIFICATION PAGE SCRIPT =====

let selfieData = "";
let tier1Done = false;
let cameraStream = null;

// ---- TIER 1: Email + Social Verify ----
async function tier1Verify() {
    const name = document.getElementById("name").value.trim();
    const contact = document.getElementById("contact").value.trim();
    const email = document.getElementById("email").value.trim();
    const social = document.getElementById("social").value.trim();
    const status = document.getElementById("tier1Status");

    if (!name || !contact || !email || !social) {
        status.innerText = "⚠️ Please fill in all Tier 1 fields!";
        status.style.color = "#e53935";
        return;
    }

    if (!email.includes("@")) {
        status.innerText = "⚠️ Please enter a valid email address!";
        status.style.color = "#e53935";
        return;
    }

    const btn = document.getElementById("tier1Btn");
    btn.innerText = "Verifying...";
    btn.disabled = true;

    // Simulate verification (in real app this would email a code)
    await new Promise(resolve => setTimeout(resolve, 1000));

    tier1Done = true;
    status.innerText = "✅ Tier 1 verified! Social & email linked successfully.";
    status.style.color = "#27ae60";
    btn.innerText = "✅ Tier 1 Done";
}

// ---- CAMERA ----
async function startCamera() {
    const cameraBtn = document.getElementById("cameraBtn");
    const captureBtn = document.getElementById("captureBtn");
    const video = document.getElementById("video");

    try {
        cameraStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        video.srcObject = cameraStream;
        video.style.display = "block";

        cameraBtn.style.display = "none";
        captureBtn.style.display = "block";

    } catch (err) {
        document.getElementById("status").innerText = "❌ Camera access denied. Please allow camera and try again.";
        document.getElementById("status").style.color = "#e53935";
        console.error("Camera error:", err);
    }
}

function capture() {
    const video = document.getElementById("video");
    const canvas = document.getElementById("canvas");
    const preview = document.getElementById("selfiePreview");
    const captureBtn = document.getElementById("captureBtn");
    const ctx = canvas.getContext("2d");

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);

    selfieData = canvas.toDataURL("image/png");

    // Show preview
    preview.src = selfieData;
    preview.style.display = "block";

    // Stop camera
    if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
        video.style.display = "none";
    }

    captureBtn.innerText = "📸 Retake Selfie";
    captureBtn.onclick = retakeSelfie;

    document.getElementById("status").innerText = "📸 Selfie captured! Now click 'Complete Verification'.";
    document.getElementById("status").style.color = "#d63384";
}

function retakeSelfie() {
    selfieData = "";
    document.getElementById("selfiePreview").style.display = "none";
    document.getElementById("captureBtn").innerText = "📸 Capture Selfie";
    document.getElementById("captureBtn").onclick = capture;
    startCamera();
}

// ---- TIER 2: Full Verification ----
async function tier2Verify() {
    const idFile = document.getElementById("idUpload").files[0];
    const status = document.getElementById("status");

    if (!tier1Done) {
        status.innerText = "⚠️ Please complete Tier 1 verification first!";
        status.style.color = "#e53935";
        return;
    }

    if (!idFile) {
        status.innerText = "⚠️ Please upload your Government ID photo!";
        status.style.color = "#e53935";
        return;
    }

    if (!selfieData) {
        status.innerText = "⚠️ Please capture your live selfie first!";
        status.style.color = "#e53935";
        return;
    }

    const btn = document.getElementById("tier2Btn");
    btn.innerText = "Verifying... please wait";
    btn.disabled = true;
    status.innerText = "🔄 Uploading your information securely...";
    status.style.color = "#d63384";

    try {
        // Read the ID file as base64
        const idData = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(idFile);
        });

        // Send to backend
        const res = await fetch("/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                name: document.getElementById("name").value.trim(),
                contact: document.getElementById("contact").value.trim(),
                idImage: idData,
                selfieImage: selfieData
            })
        });

        const result = await res.json();

        if (result.success) {
            status.innerText = result.message;
            status.style.color = "#27ae60";
            btn.innerText = "🎉 Fully Verified!";

            // Save verification status in the browser
            localStorage.setItem("travelBuddyVerified", "true");

            // Redirect back to index.html to find a buddy!
            setTimeout(() => {
                window.location.href = "index.html";
            }, 1000);

        } else {
            status.innerText = "❌ " + result.message;
            status.style.color = "#e53935";
            btn.innerText = "🔒 Try Again";
            btn.disabled = false;
        }

    } catch (err) {
        status.innerText = "❌ Network error! Make sure the server is running on http://localhost:3000";
        status.style.color = "#e53935";
        btn.innerText = "🔒 Complete Verification";
        btn.disabled = false;
        console.error("Verification error:", err);
    }
}

// ---- SOS BUTTON ----
function triggerSOS() {
    const confirmed = confirm(
        "🆘 SOS ALERT\n\n" +
        "This will:\n" +
        "• Copy your location for emergency services\n" +
        "• Show emergency numbers\n\n" +
        "Are you in danger?"
    );

    if (confirmed) {
        // Get location if possible
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(pos => {
                const lat = pos.coords.latitude;
                const lng = pos.coords.longitude;
                const mapsLink = `https://maps.google.com/?q=${lat},${lng}`;
                alert(
                    "🆘 YOUR LOCATION:\n" + mapsLink +
                    "\n\n📞 EMERGENCY NUMBERS:\n" +
                    "Police: 100\n" +
                    "Women Helpline: 1091\n" +
                    "Emergency: 112\n\n" +
                    "Share this location with someone you trust!"
                );
            }, () => {
                alert(
                    "🆘 EMERGENCY NUMBERS:\n" +
                    "Police: 100\n" +
                    "Women Helpline: 1091\n" +
                    "Emergency: 112\n\n" +
                    "Call immediately if you are in danger!"
                );
            });
        }
    }
}