# Your Travel Buddy

## Project Description

Your Travel Buddy is a web-based travel assistance platform designed to help users safely connect, communicate, and coordinate trips. The system allows users to chat in real time, find travel companions, and manage travel-related communication securely using a cloud database.

---

## Tech Stack

Frontend: HTML, CSS, JavaScript
Backend: Node.js, Express.js
Database: Firebase Realtime Database
Authentication: Firebase Authentication (if implemented)
Tools: VS Code, GitHub

---

## Features

* User login and authentication system
* Real-time messaging between users
* Secure cloud database storage using Firebase
* Backend API for sending and retrieving messages
* Responsive user interface for web access

---

## Installation

Clone the repository:

```bash
git clone https://github.com/YOUR_USERNAME/your-travel-buddy.git
cd your-travel-buddy
```

Install dependencies:

```bash
npm install
```

---

## Run Commands

Start the backend server:

```bash
node server.js
```

Open the application in browser:

```
http://localhost:3000
```

---

## Screenshots

Add at least three screenshots here, for example:

* Home page interface
* Messaging/chat screen
* Login or verification page

(Store images inside a `screenshots` folder and link them)

---

## Demo Video Link

Add your demo video link here:

```
https://your-demo-video-link.com
```

---

## Architecture Diagram

System flow:

Frontend (HTML/CSS/JS) → Express Backend → Firebase Realtime Database

(Add a diagram image created using draw.io or similar and include it here)

---

## API Documentation

### POST /send

Stores a message in the database.

Request body:

```json
{
  "user": "username",
  "text": "message content"
}
```

Response:

```json
{
  "status": "Message stored"
}
```

---

### GET /messages

Retrieves all stored messages.

Response:

```json
{
  "messageId": {
    "user": "username",
    "text": "message content",
    "time": 123456789
  }
}
```

---

## Team Members

Thasleema Nazreen
Farsana S
