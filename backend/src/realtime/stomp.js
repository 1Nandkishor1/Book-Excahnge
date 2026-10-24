// Minimal STOMP 1.2 broker over SockJS.
//
// Why: the React frontend uses @stomp/stompjs + sockjs-client (it was written for Spring's
// WebSocket support). Speaking the same protocol here means the frontend needs no changes.
//
// Supported frames: CONNECT/STOMP, SUBSCRIBE, UNSUBSCRIBE, SEND, DISCONNECT, heart-beat newlines.
//   - CONNECT must carry "Authorization: Bearer <jwt>"
//   - SUBSCRIBE /topic/offer/{offerId}  (only the buyer and the seller of that offer may)
//   - SEND /app/chat.send  with a JSON body { offerId, receiverId, content }
//   - the saved message is broadcast as a MESSAGE frame to /topic/offer/{offerId}
import sockjs from "sockjs";
import { userFromToken } from "../middleware/auth.js";
import { assertParticipant, sendMessage } from "../services/messageService.js";

const NUL = "\u0000";
const TOPIC = /^\/topic\/offer\/(\d+)$/;

const subscribers = new Map(); // destination -> Set<{ conn, subId }>
let messageCounter = 0;

const escapeHeader = (v) => v.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/:/g, "\\c").replace(/\r/g, "\\r");
const unescapeHeader = (v) => v.replace(/\\(r|n|c|\\)/g, (_, c) => ({ r: "\r", n: "\n", c: ":", "\\": "\\" })[c]);

export function buildFrame(command, headers = {}, body = "") {
  const head = Object.entries(headers)
    .map(([k, v]) => `${k}:${command === "CONNECTED" ? v : escapeHeader(String(v))}`)
    .join("\n");
  return `${command}\n${head}${head ? "\n" : ""}\n${body}${NUL}`;
}

// One SockJS message normally holds one frame, but stompjs may batch, so split on NUL.
// Bare newlines are heart-beats and are dropped.
export function parseFrames(data) {
  const frames = [];
  for (const raw of String(data).split(NUL)) {
    const text = raw.replace(/^[\r\n]+/, "");
    if (!text) continue;
    const blank = /\r?\n\r?\n/.exec(text);
    const head = blank ? text.slice(0, blank.index) : text;
    const body = blank ? text.slice(blank.index + blank[0].length) : "";
    const [command, ...lines] = head.split(/\r?\n/);
    const headers = {};
    for (const line of lines) {
      const i = line.indexOf(":");
      if (i > 0) {
        const key = unescapeHeader(line.slice(0, i));
        if (!(key in headers)) headers[key] = unescapeHeader(line.slice(i + 1)); // first value wins
      }
    }
    frames.push({ command: command.trim(), headers, body });
  }
  return frames;
}

function deliver(destination, payload) {
  const subs = subscribers.get(destination);
  if (!subs) return;
  const body = JSON.stringify(payload);
  for (const { conn, subId } of subs) {
    conn.write(
      buildFrame(
        "MESSAGE",
        {
          subscription: subId,
          "message-id": `m-${++messageCounter}`,
          destination,
          "content-type": "application/json;charset=UTF-8",
          "content-length": Buffer.byteLength(body),
        },
        body
      )
    );
  }
}

// Other modules (the REST message route) publish through this
export const broker = { publish: deliver };

function fail(conn, message) {
  conn.write(buildFrame("ERROR", { message, "content-type": "text/plain" }, message));
  conn.close(4000, message);
}

export function attachStomp(httpServer) {
  const sock = sockjs.createServer({ prefix: "/ws", log: () => {}, websocket: true });

  sock.on("connection", (conn) => {
    const session = { user: null, subs: new Map() }; // subs: subId -> destination
    let queue = Promise.resolve(); // handle one frame at a time so ordering is preserved

    const cleanup = () => {
      for (const [subId, destination] of session.subs) {
        const set = subscribers.get(destination);
        if (!set) continue;
        for (const entry of set) if (entry.conn === conn && entry.subId === subId) set.delete(entry);
        if (set.size === 0) subscribers.delete(destination);
      }
      session.subs.clear();
    };

    async function handle({ command, headers, body }) {
      if (command === "CONNECT" || command === "STOMP") {
        const auth = headers.Authorization || headers.authorization || "";
        if (!auth.startsWith("Bearer ")) return fail(conn, "Missing JWT in STOMP CONNECT");
        try {
          session.user = await userFromToken(auth.slice(7));
        } catch {
          return fail(conn, "Invalid or expired JWT");
        }
        return conn.write(
          buildFrame("CONNECTED", { version: "1.2", "heart-beat": "0,0", "user-name": String(session.user._id) })
        );
      }

      if (!session.user) return fail(conn, "Send CONNECT with a valid JWT first");

      if (command === "SUBSCRIBE") {
        const { id, destination } = headers;
        const match = TOPIC.exec(destination || "");
        if (!id || !match) return fail(conn, `Cannot subscribe to ${destination}`);
        try {
          await assertParticipant(Number(match[1]), session.user._id);
        } catch (err) {
          return fail(conn, err.message);
        }
        if (!subscribers.has(destination)) subscribers.set(destination, new Set());
        subscribers.get(destination).add({ conn, subId: id });
        session.subs.set(id, destination);
      } else if (command === "UNSUBSCRIBE") {
        const destination = session.subs.get(headers.id);
        const set = destination && subscribers.get(destination);
        if (set) for (const entry of set) if (entry.conn === conn && entry.subId === headers.id) set.delete(entry);
        session.subs.delete(headers.id);
      } else if (command === "SEND") {
        if (headers.destination === "/app/chat.send") {
          try {
            const saved = await sendMessage(JSON.parse(body), session.user);
            deliver(`/topic/offer/${saved.offerId}`, saved);
          } catch (err) {
            // Not fatal: the browser UI can't show STOMP errors, and an ERROR frame would drop the socket.
            console.warn(`[stomp] message from user ${session.user._id} rejected: ${err.message}`);
          }
        }
      } else if (command === "DISCONNECT") {
        if (headers.receipt) conn.write(buildFrame("RECEIPT", { "receipt-id": headers.receipt }));
        cleanup();
        return conn.close();
      }

      if (headers.receipt && command !== "DISCONNECT") {
        conn.write(buildFrame("RECEIPT", { "receipt-id": headers.receipt }));
      }
    }

    conn.on("data", (data) => {
      for (const frame of parseFrames(data)) {
        queue = queue.then(() => handle(frame)).catch((err) => console.error("[stomp]", err));
      }
    });
    conn.on("close", cleanup);
  });

  sock.installHandlers(httpServer, { prefix: "/ws" });
}
