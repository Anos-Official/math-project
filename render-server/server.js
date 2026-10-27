const http = require("http");
const crypto = require("crypto");
const WebSocket = require("ws");

const PORT = process.env.PORT || 10000;
const CONTROLLER_KEY = process.env.CONTROLLER_KEY || "";
const MAX_SLIDE = 50;
const MAX_QUESTION = 20;
const AUTH_TIMEOUT_MS = 5000;
const HEARTBEAT_MS = 30000;

if (!CONTROLLER_KEY) console.warn("CONTROLLER_KEY is not set. Controller connections will be denied.");

// Plain HTTP response: used as a health check and to wake the service from sleep.
const server = http.createServer((_, response) => {
  response.writeHead(200, {
    "content-type": "application/json",
    "access-control-allow-origin": "*",
    "cache-control": "no-store"
  });
  response.end(JSON.stringify({ ok: true }));
});

const wss = new WebSocket.Server({ server, path: "/ws", maxPayload: 1024 });

// room name -> { displays, controllers, last (last valid command), lastAt (when it arrived) }
const rooms = new Map();

function getRoom(name) {
  if (!rooms.has(name)) rooms.set(name, { displays: new Set(), controllers: new Set(), last: null, lastAt: 0 });
  return rooms.get(name);
}

function dropIfEmpty(name, room) {
  if (!room.displays.size && !room.controllers.size && rooms.get(name) === room) rooms.delete(name);
}

// Constant-time comparison so response time doesn't leak how much of the key matched.
function keyMatches(candidate) {
  if (!CONTROLLER_KEY || typeof candidate !== "string") return false;
  const a = crypto.createHash("sha256").update(candidate).digest();
  const b = crypto.createHash("sha256").update(CONTROLLER_KEY).digest();
  return crypto.timingSafeEqual(a, b);
}

const isInt = (value, min, max) => Number.isInteger(value) && value >= min && value <= max;

// Returns a sanitized command, or null if it isn't one we accept.
function cleanCommand(data) {
  if (!data || typeof data !== "object") return null;
  switch (data.type) {
    case "go":
      return isInt(data.index, 0, MAX_SLIDE) ? { type: "go", index: data.index } : null;
    case "question":
    case "restart":
    case "answer":
      return isInt(data.question, 1, MAX_QUESTION) && isInt(data.count, 1, 999) && isInt(data.seconds, 5, 600)
        ? { type: data.type, question: data.question, count: data.count, seconds: data.seconds }
        : null;
    case "move-on":
      return { type: "move-on" };
    default:
      return null;
  }
}

// What a display should receive when it (re)connects. For a running timer we
// include how long ago it started, so a refresh doesn't restart the countdown.
function replayFor(room) {
  if (!room.last) return null;
  const message = { ...room.last };
  if (message.type === "question" || message.type === "restart") message.elapsedMs = Date.now() - room.lastAt;
  return JSON.stringify(message);
}

wss.on("connection", (socket, request) => {
  const url = new URL(request.url, "http://localhost");
  const roomName = (url.searchParams.get("room") || "math-match").slice(0, 80);
  const role = url.searchParams.get("role");

  socket.isAlive = true;
  socket.on("pong", () => { socket.isAlive = true; });
  socket.on("error", () => {});

  if (role !== "display" && role !== "controller") {
    socket.close(1008, "Unknown role");
    return;
  }

  let room = null;
  let authed = false;
  let authTimer = null;

  if (role === "display") {
    room = getRoom(roomName);
    room.displays.add(socket);
    const replay = replayFor(room);
    if (replay) socket.send(replay);
  } else {
    // The key travels in the first message, not the URL, so it never appears in logs.
    authTimer = setTimeout(() => socket.close(1008, "Auth timeout"), AUTH_TIMEOUT_MS);
  }

  socket.on("message", raw => {
    if (role !== "controller") return;

    let data;
    try { data = JSON.parse(raw.toString()); } catch { return; }

    if (!authed) {
      if (data && data.type === "auth" && keyMatches(data.key)) {
        authed = true;
        clearTimeout(authTimer);
        room = getRoom(roomName);
        room.controllers.add(socket);
        socket.send(JSON.stringify({ type: "authed" }));
      } else {
        socket.close(1008, "Unauthorized");
      }
      return;
    }

    const message = cleanCommand(data);
    if (!message) return;

    room.last = message;
    room.lastAt = Date.now();
    const payload = JSON.stringify(message);
    for (const display of room.displays) {
      if (display.readyState === WebSocket.OPEN) display.send(payload);
    }
  });

  socket.on("close", () => {
    clearTimeout(authTimer);
    if (!room) return;
    room.displays.delete(socket);
    room.controllers.delete(socket);
    dropIfEmpty(roomName, room);
  });
});

// Heartbeat: keeps idle connections alive through proxies and drops dead ones.
setInterval(() => {
  for (const socket of wss.clients) {
    if (!socket.isAlive) { socket.terminate(); continue; }
    socket.isAlive = false;
    socket.ping();
  }
}, HEARTBEAT_MS);

server.listen(PORT, "0.0.0.0", () => console.log("Listening on " + PORT));
