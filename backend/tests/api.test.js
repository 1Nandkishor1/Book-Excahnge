// End-to-end test of the whole backend. Needs a running MongoDB (see README, "Testing").
//   MONGODB_TEST_URI=mongodb://127.0.0.1:27017 npm test
// It uses a throwaway database, starts the server on a random port, and talks to it over real HTTP
// and over a real SockJS + STOMP connection (the same libraries the React frontend uses).
import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import SockJS from "sockjs-client";
import { Client } from "@stomp/stompjs";
import { startServer } from "../src/server.js";

const MONGO = process.env.MONGODB_TEST_URI || "mongodb://127.0.0.1:27017";
const DB = `book_exchange_test_${Date.now()}`;
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
  "base64"
);

let app, base;
const users = {}; // seller, buyer, other -> { id, token }
const state = {};

async function call(method, path, { token, body, form } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  let payload;
  if (form) payload = form;
  else if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    payload = JSON.stringify(body);
  }
  const res = await fetch(base + path, { method, headers, body: payload });
  const text = await res.text();
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch { /* not json */ }
  return { status: res.status, json, headers: res.headers };
}

const until = (fn, ms = 4000) =>
  new Promise((resolve, reject) => {
    const t0 = Date.now();
    const tick = () => {
      const v = fn();
      if (v) return resolve(v);
      if (Date.now() - t0 > ms) return reject(new Error("timed out waiting for condition"));
      setTimeout(tick, 25);
    };
    tick();
  });

// Connects exactly the way the frontend's ChatBox does
function chatClient(token, offerId) {
  const received = [];
  const client = new Client({
    webSocketFactory: () => new SockJS(`${base}/ws`),
    connectHeaders: { Authorization: `Bearer ${token}` },
    reconnectDelay: 0,
  });
  const ready = new Promise((resolve, reject) => {
    client.onConnect = () => {
      client.subscribe(`/topic/offer/${offerId}`, (f) => received.push(JSON.parse(f.body)), { receipt: `sub-${offerId}` });
      client.watchForReceipt(`sub-${offerId}`, resolve);
    };
    client.onStompError = (f) => reject(new Error(f.headers.message));
    client.onWebSocketClose = () => reject(new Error("socket closed"));
  });
  client.activate();
  return { client, received, ready };
}

describe("Campus Book Exchange API", () => {
  before(async () => {
    app = await startServer({ port: 0, mongoUri: `${MONGO}/${DB}` });
    base = `http://127.0.0.1:${app.port}`;
  });

  after(async () => {
    await mongoose.connection.dropDatabase();
    await app.stop();
  });

  it("serves a health check and a JSON 404", async () => {
    assert.equal((await call("GET", "/health")).json.status, "ok");
    const missing = await call("GET", "/nope");
    assert.equal(missing.status, 404);
    assert.ok(missing.json.message);
  });

  it("validates registration with a { field: message } body", async () => {
    const r = await call("POST", "/auth/register", { body: { email: "bad", password: "123" } });
    assert.equal(r.status, 400);
    assert.equal(r.json.fullName, "Full name is required");
    assert.equal(r.json.email, "Email must be valid");
    assert.equal(r.json.password, "Password must be at least 6 characters");
  });

  it("registers three users with numeric ids and rejects a duplicate email", async () => {
    for (const [key, name] of [["seller", "Sam Seller"], ["buyer", "Bea Buyer"], ["other", "Olly Other"]]) {
      const r = await call("POST", "/auth/register", {
        body: { fullName: name, email: `${key}@campus.test`, password: "secret123", college: "TCET", department: "Computer" },
      });
      assert.equal(r.status, 200);
      assert.equal(typeof r.json.userId, "number");
      assert.ok(r.json.token);
      assert.deepEqual(Object.keys(r.json).sort(), ["email", "fullName", "token", "userId"]);
      users[key] = { id: r.json.userId, token: r.json.token };
    }
    assert.deepEqual([users.seller.id, users.buyer.id, users.other.id], [1, 2, 3]);
    const dup = await call("POST", "/auth/register", { body: { fullName: "X", email: "SELLER@campus.test", password: "secret123" } });
    assert.equal(dup.status, 400);
    assert.equal(dup.json.message, "An account with this email already exists");
  });

  it("logs in, and answers 401 with a message for a wrong password", async () => {
    const ok = await call("POST", "/auth/login", { body: { email: "seller@campus.test", password: "secret123" } });
    assert.equal(ok.status, 200);
    assert.equal(ok.json.userId, users.seller.id);
    const bad = await call("POST", "/auth/login", { body: { email: "seller@campus.test", password: "wrong-pass" } });
    assert.equal(bad.status, 401);
    assert.equal(bad.json.message, "Invalid email or password");
  });

  it("protects private routes with 401", async () => {
    assert.equal((await call("POST", "/books", { body: {} })).status, 401);
    assert.equal((await call("GET", "/books/mine")).status, 401);
    assert.equal((await call("GET", "/offers")).status, 401);
    assert.equal((await call("GET", "/users/profile", { token: "garbage" })).status, 401);
  });

  it("creates a book and returns the DTO shape the frontend reads", async () => {
    const bad = await call("POST", "/books", { token: users.seller.token, body: { author: "x" } });
    assert.equal(bad.status, 400);
    assert.equal(bad.json.title, "Title is required");
    assert.equal(bad.json.type, "Type (SELL or SWAP) is required");

    const r = await call("POST", "/books", {
      token: users.seller.token,
      body: { title: "Operating System Concepts", author: "Silberschatz", subject: "Operating Systems", course: "CS301", edition: "9th", condition: "Good", type: "SELL", price: 450, description: "Some notes inside" },
    });
    assert.equal(r.status, 200);
    assert.equal(r.json.id, 1);
    assert.equal(r.json.sellerId, users.seller.id);
    assert.equal(r.json.sellerName, "Sam Seller");
    assert.equal(r.json.available, true);
    assert.equal(r.json.price, 450);
    assert.equal(r.json.imageUrl, null);
    state.book = r.json;

    const swap = await call("POST", "/books", {
      token: users.seller.token,
      body: { title: "Digital Logic", subject: "Digital Logic", type: "SWAP", price: 999 },
    });
    assert.equal(swap.json.price, null); // swap listings never carry a price
    state.swapBook = swap.json;
  });

  it("uploads an image, serves it, and rejects non-images", async () => {
    const form = new FormData();
    form.append("file", new Blob([PNG], { type: "image/png" }), "cover.png");
    const up = await call("POST", "/books/upload-image", { token: users.seller.token, form });
    assert.equal(up.status, 200);
    assert.match(up.json.imageUrl, /^\/uploads\/[\w-]+\.png$/);
    const img = await fetch(base + up.json.imageUrl);
    assert.equal(img.status, 200);
    assert.equal(img.headers.get("content-type"), "image/png");
    assert.equal(img.headers.get("cross-origin-resource-policy"), "cross-origin");
    state.imageUrl = up.json.imageUrl;
    assert.equal((await fetch(`${base}/uploads/not-a-real-image.png`)).status, 404);

    const txt = new FormData();
    txt.append("file", new Blob(["hello"], { type: "text/plain" }), "a.txt");
    const bad = await call("POST", "/books/upload-image", { token: users.seller.token, form: txt });
    assert.equal(bad.status, 400);
    assert.ok(bad.json.message);
  });

  it("updates a listing (owner only) and keeps the image when none is sent", async () => {
    const edit = { ...state.book, condition: "Like new", imageUrl: state.imageUrl };
    const r = await call("PUT", `/books/${state.book.id}`, { token: users.seller.token, body: edit });
    assert.equal(r.status, 200);
    assert.equal(r.json.condition, "Like new");
    assert.equal(r.json.imageUrl, state.imageUrl);

    const again = await call("PUT", `/books/${state.book.id}`, { token: users.seller.token, body: { ...edit, imageUrl: null } });
    assert.equal(again.json.imageUrl, state.imageUrl);

    const stranger = await call("PUT", `/books/${state.book.id}`, { token: users.buyer.token, body: edit });
    assert.equal(stranger.status, 400); // 400 not 403: the frontend logs people out on 403
    assert.equal(stranger.json.message, "You are not the owner of this listing");
  });

  it("lists, fetches and searches books publicly", async () => {
    const all = await call("GET", "/books");
    assert.deepEqual(all.json.map((b) => b.id), [1, 2]);
    assert.equal((await call("GET", "/books/1")).json.title, "Operating System Concepts");
    assert.equal((await call("GET", "/books/999")).status, 404);
    assert.equal((await call("GET", "/books/abc")).status, 404);
    const mine = await call("GET", "/books/mine", { token: users.seller.token });
    assert.equal(mine.json.length, 2);
    assert.equal((await call("GET", "/books/mine", { token: users.buyer.token })).json.length, 0);

    const s = (qs) => call("GET", `/books/search?${qs}`).then((r) => r.json.map((b) => b.id));
    assert.deepEqual(await s("subject=operating%20systems"), [1]);
    assert.deepEqual(await s("title=logic"), [2]);
    assert.deepEqual(await s("author=silber"), [1]);
    assert.deepEqual(await s("course=cs301"), [1]);
    assert.deepEqual(await s("title=("), []); // regex characters are escaped, not executed
    assert.deepEqual(await s(""), [1, 2]);
  });

  it("creates offers with the right validation", async () => {
    const own = await call("POST", "/offers", { token: users.seller.token, body: { bookId: 1, offerType: "BUY", offeredPrice: 400 } });
    assert.equal(own.status, 400);
    assert.equal(own.json.message, "You cannot make an offer on your own listing");

    const noPrice = await call("POST", "/offers", { token: users.buyer.token, body: { bookId: 1, offerType: "BUY" } });
    assert.equal(noPrice.json.message, "offeredPrice is required for a BUY offer");
    const noSwap = await call("POST", "/offers", { token: users.buyer.token, body: { bookId: 1, offerType: "SWAP", swapBookDescription: "  " } });
    assert.equal(noSwap.json.message, "swapBookDescription is required for a SWAP offer");
    const noBook = await call("POST", "/offers", { token: users.buyer.token, body: { bookId: 77, offerType: "BUY", offeredPrice: 5 } });
    assert.equal(noBook.status, 404);
    const empty = await call("POST", "/offers", { token: users.buyer.token, body: {} });
    assert.equal(empty.json.bookId, "bookId is required");

    const ok = await call("POST", "/offers", { token: users.buyer.token, body: { bookId: 1, offerType: "BUY", offeredPrice: 400 } });
    assert.equal(ok.status, 200);
    assert.deepEqual(
      { ...ok.json },
      {
        id: 1, bookId: 1, offerType: "BUY", offeredPrice: 400, swapBookDescription: null, status: "PENDING",
        buyerId: users.buyer.id, buyerName: "Bea Buyer", bookTitle: "Operating System Concepts",
        sellerId: users.seller.id, sellerName: "Sam Seller", bookSubject: "Operating Systems", bookImageUrl: state.imageUrl,
      }
    );
    state.offer = ok.json;

    const dup = await call("POST", "/offers", { token: users.buyer.token, body: { bookId: 1, offerType: "BUY", offeredPrice: 350 } });
    assert.equal(dup.json.message, "You already have a pending offer on this book");
  });

  it("shows offers to the buyer (sent) and the seller (received)", async () => {
    const sent = await call("GET", "/offers", { token: users.buyer.token });
    assert.deepEqual(sent.json.map((o) => o.id), [1]);
    const got = await call("GET", "/offers/received", { token: users.seller.token });
    assert.deepEqual(got.json.map((o) => o.id), [1]);
    assert.deepEqual((await call("GET", "/offers/received", { token: users.buyer.token })).json, []);
  });

  it("chats live over SockJS + STOMP exactly like the frontend", async () => {
    const offerId = state.offer.id;
    const buyer = chatClient(users.buyer.token, offerId);
    const seller = chatClient(users.seller.token, offerId);
    await Promise.all([buyer.ready, seller.ready]);

    buyer.client.publish({ destination: "/app/chat.send", body: JSON.stringify({ offerId, receiverId: users.seller.id, content: "Is this still available?" }) });
    await until(() => buyer.received.length === 1 && seller.received.length === 1);
    seller.client.publish({ destination: "/app/chat.send", body: JSON.stringify({ offerId, receiverId: users.buyer.id, content: "Yes! Library at 4?" }) });
    await until(() => buyer.received.length === 2 && seller.received.length === 2);

    const m = seller.received[0];
    assert.deepEqual(Object.keys(m).sort(), ["content", "id", "offerId", "receiverId", "seen", "senderId", "senderName", "time"]);
    assert.equal(m.senderId, users.buyer.id);
    assert.equal(m.senderName, "Bea Buyer");
    assert.equal(m.receiverId, users.seller.id);
    assert.equal(m.seen, false);
    assert.ok(!Number.isNaN(new Date(m.time).getTime()));
    assert.equal(buyer.received[1].content, "Yes! Library at 4?");

    // A message that breaks the rules is dropped without killing the connection
    buyer.client.publish({ destination: "/app/chat.send", body: JSON.stringify({ offerId, receiverId: users.buyer.id, content: "to myself" }) });
    buyer.client.publish({ destination: "/app/chat.send", body: JSON.stringify({ offerId, receiverId: users.seller.id, content: "still connected" }) });
    await until(() => seller.received.length === 3);
    assert.equal(seller.received[2].content, "still connected");
    assert.equal(buyer.client.connected, true);

    await Promise.all([buyer.client.deactivate(), seller.client.deactivate()]);
  });

  it("keeps the conversation private and serves history in order", async () => {
    const offerId = state.offer.id;
    const hist = await call("GET", `/messages/${offerId}`, { token: users.seller.token });
    assert.deepEqual(hist.json.map((m) => m.content), ["Is this still available?", "Yes! Library at 4?", "still connected"]);
    assert.equal((await call("GET", `/messages/${offerId}`, { token: users.buyer.token })).status, 200);

    const spy = await call("GET", `/messages/${offerId}`, { token: users.other.token });
    assert.equal(spy.status, 400);
    assert.equal(spy.json.message, "You are not part of this conversation");

    // A stranger cannot join the live topic either
    const intruder = chatClient(users.other.token, offerId);
    await assert.rejects(intruder.ready, /not part of this conversation|socket closed/);
    intruder.client.deactivate();

    // Connecting without a valid token is refused
    const anon = chatClient("not-a-jwt", offerId);
    await assert.rejects(anon.ready, /Invalid or expired JWT|socket closed/);
    anon.client.deactivate();
  });

  it("supports the REST message fallback and pushes it to the socket", async () => {
    const offerId = state.offer.id;
    const seller = chatClient(users.seller.token, offerId);
    await seller.ready;
    const r = await call("POST", "/messages", { token: users.buyer.token, body: { offerId, receiverId: users.seller.id, content: "sent over REST" } });
    assert.equal(r.status, 200);
    await until(() => seller.received.some((m) => m.content === "sent over REST"));
    const bad = await call("POST", "/messages", { token: users.buyer.token, body: { offerId } });
    assert.equal(bad.status, 400);
    assert.equal(bad.json.content, "content is required");
    await seller.client.deactivate();
  });

  it("lets only the seller accept, hides the book, and blocks further offers", async () => {
    const id = state.offer.id;
    const wrong = await call("PUT", `/offers/${id}/accept`, { token: users.buyer.token });
    assert.equal(wrong.status, 400);
    assert.equal(wrong.json.message, "Only the seller of this book can respond to the offer");

    const ok = await call("PUT", `/offers/${id}/accept`, { token: users.seller.token });
    assert.equal(ok.json.status, "ACCEPTED");
    assert.deepEqual((await call("GET", "/books")).json.map((b) => b.id), [2]);
    assert.equal((await call("GET", "/books/1")).json.available, false);
    assert.equal((await call("GET", "/books/mine", { token: users.seller.token })).json.length, 2);

    const late = await call("POST", "/offers", { token: users.other.token, body: { bookId: 1, offerType: "BUY", offeredPrice: 10 } });
    assert.equal(late.json.message, "This book is no longer available");
  });

  it("rejects an offer on the swap listing", async () => {
    const o = await call("POST", "/offers", { token: users.other.token, body: { bookId: 2, offerType: "SWAP", swapBookDescription: "Maths II, Good" } });
    assert.equal(o.status, 200);
    assert.equal(o.json.swapBookDescription, "Maths II, Good");
    assert.equal(o.json.offeredPrice, null);
    const r = await call("PUT", `/offers/${o.json.id}/reject`, { token: users.seller.token });
    assert.equal(r.json.status, "REJECTED");
    assert.equal((await call("GET", "/books/2")).json.available, true); // declining does not hide the book
  });

  it("refuses to delete listings that have offers, and deletes the rest", async () => {
    const blocked = await call("DELETE", "/books/1", { token: users.seller.token });
    assert.equal(blocked.status, 400);
    assert.match(blocked.json.message, /has offers/);

    const fresh = await call("POST", "/books", { token: users.seller.token, body: { title: "Temp", type: "SWAP" } });
    const stranger = await call("DELETE", `/books/${fresh.json.id}`, { token: users.buyer.token });
    assert.equal(stranger.status, 400);
    const del = await call("DELETE", `/books/${fresh.json.id}`, { token: users.seller.token });
    assert.equal(del.status, 204);
    assert.equal((await call("GET", `/books/${fresh.json.id}`)).status, 404);
  });

  it("reads and updates the profile", async () => {
    const p = await call("GET", "/users/profile", { token: users.buyer.token });
    assert.deepEqual(p.json, { id: users.buyer.id, fullName: "Bea Buyer", email: "buyer@campus.test", phone: null, college: "TCET", department: "Computer" });
    const bad = await call("PUT", "/users/profile", { token: users.buyer.token, body: { fullName: " " } });
    assert.equal(bad.json.fullName, "Full name is required");
    const upd = await call("PUT", "/users/profile", { token: users.buyer.token, body: { fullName: "Beatrice Buyer", phone: "9999999999", college: "TCET", department: "IT" } });
    assert.equal(upd.json.fullName, "Beatrice Buyer");
    assert.equal(upd.json.phone, "9999999999");
    assert.equal(upd.json.email, "buyer@campus.test");
  });
});
