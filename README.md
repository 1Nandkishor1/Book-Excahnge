# Campus Book Exchange (MERN)

A second-hand book marketplace for students. List books for sale or swap, search by subject or course,
send buy or swap offers, and chat with the seller to agree on a meetup.

**Stack:** MongoDB, Express, React, Node.js. Chat uses WebSockets (SockJS + STOMP).

> **Migration note.** This project started as Spring Boot + MySQL. The backend was rewritten in
> Node/Express/MongoDB **without changing the React frontend**. The API's JSON shapes, status codes and the
> chat protocol are identical, so the frontend does not know the difference. The old backend is kept in
> `legacy-spring-backend/` as a reference only. It can be deleted once you no longer need it.

---

## 1. Status (read this first if you are picking the project up)

| Area | State |
|---|---|
| Express API: auth, profile, books, search, image upload, offers, messages | Done and tested |
| Real-time chat (SockJS + STOMP server in `backend/src/realtime/stomp.js`) | Done and tested with the frontend's own libraries |
| MongoDB models with numeric sequential ids | Done |
| Frontend (React, Redux Toolkit, Tailwind) | Unchanged by the migration, works against the new API contract |
| Automated tests: `backend/tests/api.test.js` (18 tests, real MongoDB) | All passing |
| Click-through of the real UI in a browser against the Node backend | **Not yet done by an automated agent.** Do this first (section 8) |
| Render deployment: `render.yaml` Blueprint, images stored in MongoDB | Done, see section 11. Not yet deployed by an automated agent |
| Docs (this file) | Up to date |

Nothing is half-finished. What is left is optional hardening and deployment (section 9).

---

## 2. Run it locally

### Prerequisites
- Node.js 18 or newer
- MongoDB running locally, **or** a free MongoDB Atlas cluster (then set `MONGODB_URI`)

### MongoDB on a Mac (Homebrew)
```bash
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community
```

### Backend (API on http://localhost:8080)
```bash
cd backend
cp .env.example .env        # defaults work for local dev; edit JWT_SECRET before deploying
npm install
npm start                   # or: npm run dev   (restarts on file changes)
```
Collections are created automatically on first write. Check it is alive: http://localhost:8080/health

### Frontend (app on http://localhost:5173)
```bash
cd frontend
npm install
npm run dev
```
The frontend calls `http://localhost:8080` by default. To point it elsewhere, create `frontend/.env`
containing `VITE_API_URL=https://your-api.example.com`.

Existing accounts and listings from the MySQL version are **not** carried over. Register again.

---

## 3. Repository layout

```
backend/
  src/
    server.js            starts HTTP + Mongo + the chat socket (also exports startServer for tests)
    app.js               Express app: middleware, routes, error handling
    config.js            environment variables with safe local defaults
    models/              Mongoose schemas: User, Book, Offer, Message, Image, Counter (id sequence)
    routes/              thin HTTP layer, one file per resource
    services/            business rules (the Spring "service" layer): validation, ownership, workflow
    middleware/          auth (JWT), upload (multer, in memory), error (JSON error bodies)
    realtime/stomp.js    STOMP 1.2 broker over SockJS (the chat)
    utils/               dto.js (response shapes), errors.js, validate.js
  tests/api.test.js      end-to-end test suite
  .env.example
frontend/                React app (unchanged by the migration, apart from a one-line tweak in src/config.js)
render.yaml              Render Blueprint (API + website), see section 11
legacy-spring-backend/   the original Spring Boot backend, reference only
```

---

## 4. API contract (the frontend depends on every detail here)

Base URL `http://localhost:8080`. JSON in and out. Protected routes need `Authorization: Bearer <jwt>`.
`id` values are **numbers** (1, 2, 3...), not Mongo ObjectIds.

| Method | Path | Auth | Body or query | Returns |
|---|---|---|---|---|
| POST | `/auth/register` | no | `fullName, email, password` (+ `phone, college, department`) | `{ token, userId, fullName, email }` |
| POST | `/auth/login` | no | `email, password` | same as register |
| GET | `/users/profile` | yes | | `{ id, fullName, email, phone, college, department }` |
| PUT | `/users/profile` | yes | `fullName, phone, college, department` | same as GET |
| GET | `/books` | no | | all **available** books, oldest first |
| GET | `/books/search` | no | `subject, course` (exact, ignore case), `author, title` (contains) | available books |
| GET | `/books/mine` | yes | | all of my books, including hidden ones |
| GET | `/books/:id` | no | | one book (even if not available) |
| POST | `/books` | yes | book fields | the book |
| PUT | `/books/:id` | yes (owner) | book fields (+ `available`) | the book |
| DELETE | `/books/:id` | yes (owner) | | `204` |
| POST | `/books/upload-image` | yes | multipart field `file` (JPG/PNG/WebP/GIF, max 5 MB) | `{ imageUrl: "/uploads/<uuid>.png" }` |
| POST | `/offers` | yes | `bookId, offerType` + `offeredPrice` (BUY) or `swapBookDescription` (SWAP) | offer |
| GET | `/offers` | yes | | offers I sent |
| GET | `/offers/received` | yes | | offers on my books |
| PUT | `/offers/:id/accept` | yes (seller) | | offer, and the book becomes `available: false` |
| PUT | `/offers/:id/reject` | yes (seller) | | offer |
| GET | `/messages/:offerId` | yes (buyer or seller) | | messages, oldest first |
| POST | `/messages` | yes (buyer or seller) | `offerId, receiverId, content` | message (REST fallback, also pushed to the socket) |
| GET | `/uploads/:file` | no | | an uploaded image, read from MongoDB |
| GET | `/health` | no | | `{ status: "ok" }` |

### Response shapes

```
Book   { id, title, author, subject, course, edition, condition, type: "SELL"|"SWAP", price, description,
         imageUrl, available, sellerId, sellerName }
Offer  { id, bookId, offerType: "BUY"|"SWAP", offeredPrice, swapBookDescription, status: "PENDING"|"ACCEPTED"|"REJECTED",
         buyerId, buyerName, bookTitle, sellerId, sellerName, bookSubject, bookImageUrl }
Message{ id, offerId, receiverId, senderId, senderName, content, time (ISO 8601 UTC), seen }
```
Fields without a value are `null`, never missing. The mappers live in `backend/src/utils/dto.js`.

### Errors
- Field validation: `400` with `{ "<field>": "<message>" }`, for example `{ "email": "Email must be valid" }`.
- Everything else: `{ timestamp, status, message, path }`.
- The frontend shows `message` (or the first field message) directly to the user.

---

## 5. Chat protocol (STOMP over SockJS)

The frontend (`frontend/src/components/ChatBox.jsx`) uses `@stomp/stompjs` with `sockjs-client`. The Node server
implements just enough STOMP 1.2 to serve it, in `backend/src/realtime/stomp.js`:

1. Connect SockJS to `http://localhost:8080/ws`.
2. STOMP `CONNECT` with header `Authorization: Bearer <jwt>`. Bad or missing token gives an `ERROR` frame and the socket closes.
3. `SUBSCRIBE` to `/topic/offer/{offerId}`. Only the buyer and the seller of that offer are allowed.
4. `SEND` to `/app/chat.send` with JSON body `{ offerId, receiverId, content }`.
5. The server saves the message and broadcasts it as a `MESSAGE` frame to everyone subscribed to `/topic/offer/{offerId}`.
   The body is the Message shape above.

A `SEND` that breaks a rule (not a participant, empty content, wrong receiver) is **dropped and logged**, not answered
with an `ERROR` frame, because an `ERROR` would disconnect the chat in the UI. Heart-beats are not used (`0,0`).

---

## 6. Rules for anyone changing this code

1. **Do not change the API contract or the chat protocol** without also changing the frontend.
2. **Ids must stay numeric.** The frontend sorts with `b.id - a.id` and compares ids with `===`. That is why the models use
   `_id: Number` and `nextId("books")` (a counter document) instead of ObjectIds.
3. **Never answer a business-rule failure with 401 or 403.** The frontend (`frontend/src/services/api.js`) clears the login and
   redirects to `/login` on any 401/403 for a request that carried a token (except calls to `/auth/*`).
   Use 400 for "you can't do that" and 404 for "not found". A real expired token should give 401.
4. Keep validation messages as they are. Several are shown to users as is.
5. Keep CORS aligned with where the frontend runs (`CLIENT_ORIGINS`). SockJS needs this too.

---

## 7. Data model (MongoDB, database `book_exchange`)

| Collection | Fields |
|---|---|
| `users` | `_id` (Number), fullName, email (unique, lowercase), passwordHash (bcrypt), phone, college, department, createdAt |
| `books` | `_id`, title, author, subject, course, edition, condition, type (SELL/SWAP), price, description, imageUrl, available, seller (user id), createdAt |
| `offers` | `_id`, offerType (BUY/SWAP), offeredPrice, swapBookDescription, status, buyer (user id), book (book id), createdAt |
| `messages` | `_id`, content, time, seen, sender, receiver, offer (offer id) |
| `images` | `_id` (uuid, also the file name in the URL), contentType, data (the photo bytes), createdAt |
| `counters` | `_id` (sequence name), seq. Hands out the next numeric id for each collection |

Relationships are plain id references, resolved with Mongoose `populate`.

---

## 8. Testing

### Automated (backend)
Needs a running MongoDB. It uses a throwaway database and drops it afterwards.
```bash
cd backend
npm install
MONGODB_TEST_URI=mongodb://127.0.0.1:27017 npm test
```
The suite starts the real server on a random port and covers registration, login, protected routes, book CRUD, image upload,
search (including regex-injection safety), the offer workflow, privacy of conversations, live chat through **SockJS + STOMP using
the same client libraries as the frontend**, the REST message fallback, accept/reject, delete rules and profile updates.

### Manual click-through (do this first when picking the project up)
Run backend and frontend, then with two browsers (or one normal and one private window):
1. Register two users. Log in as each.
2. User A: **Sell a book** with a photo. Check it appears on Browse and in **My listings**.
3. User B: open the book, **Make an offer**, send it, and send a chat message.
4. User A: **Offers** shows a badge. Open the offer, check the message arrived **without refreshing**, reply, then **Accept**.
5. Check the book disappears from Browse, and A's "Listed" switch shows off.
6. Try: wrong password (message must stay on screen), edit a listing, delete with Undo, filters and search on Browse.

If something is wrong, it is almost always a difference in a response shape or status code. Compare with section 4 and with
`legacy-spring-backend/` (which is the original behaviour).

---

## 9. Optional next steps

- Deploy: MongoDB Atlas + a Node host (Render, Railway, Fly.io) + a static host for the frontend. Set `JWT_SECRET`,
  `MONGODB_URI`, `CLIENT_ORIGINS`, and `VITE_API_URL`. Photos are stored in MongoDB (see section 11 for why). If the
  Atlas free tier (512 MB) fills up, move them to Cloudinary or S3: change `services/imageService.js` and make
  `frontend/src/components/BookCover.jsx` use `book.imageUrl` as is when it starts with `http`.
- Rate limiting on `/auth/*` (for example `express-rate-limit`) and a refresh-token flow.
- Mark messages as `seen` and show unread counts (the `seen` field already exists).
- Decline other pending offers automatically when one is accepted.
- Pagination for `GET /books` once there are many listings (the frontend currently filters in the browser).
- A seed script with demo users and books for portfolio demos.
- Docker Compose with `mongo`, `backend` and `frontend`.

---

## 10. What changed from the Spring version (behaviour you may notice)

All of these are compatible with the unchanged frontend.

| Topic | Spring | Node |
|---|---|---|
| Missing or invalid token | `403` | `401` (the frontend handles both) |
| `GET /books/mine` | technically public | requires login |
| Reading or subscribing to a chat | any logged-in user | only the buyer and seller of that offer |
| Message receiver | any existing user | must be the other person in the conversation |
| Second pending offer on the same book by the same buyer | allowed | `400` "You already have a pending offer on this book" |
| Deleting a listing that has offers | `500` database error | `400` with an explanation |
| SELL listing without a price | accepted | `400` (and SWAP listings always store `price: null`) |
| Uploaded files | saved on the server's disk, any type | saved in MongoDB, JPG/PNG/WebP/GIF only, 5 MB max |
| Server errors | internal message leaked | generic message, details only in the server log |
| Message `time` | local time without zone | ISO 8601 UTC (`...Z`), which browsers parse correctly |

---

## 11. Deploying to Render

Render hosts the API and the website. It does **not** host MongoDB, so the database lives on MongoDB Atlas (free).

### Why the code is set up this way
- **Photos are stored in MongoDB, not on disk.** Render's disk is wiped on every deploy and whenever a free service goes
  idle and restarts. Photos saved to disk would silently disappear. The database survives, and the URLs stay
  `/uploads/<uuid>.png`, so the frontend needed no change.
- **`PORT` comes from Render.** `config.js` already reads `process.env.PORT`.
- **`JWT_SECRET` is required in production.** The server refuses to start with `NODE_ENV=production` and no secret.
- **WebSockets work on Render web services**, so SockJS/STOMP chat needs no change. Render terminates TLS, so the browser
  uses `wss://` automatically because the API URL is `https://`.
- **`VITE_API_URL` is read at build time.** After changing it the website must be rebuilt (Manual Deploy -> Clear build cache & deploy).

### Steps
1. **Push the repo to GitHub** (`.gitignore` already excludes `node_modules` and `.env`).
2. **MongoDB Atlas**: create a free M0 cluster. Database Access -> add a user with a password. Network Access -> add
   `0.0.0.0/0` (Render's outgoing addresses change, so a fixed allow-list will not work). Connect -> Drivers -> copy the
   connection string and put the database name before the `?`:
   `mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/book_exchange?retryWrites=true&w=majority`
   (URL-encode special characters in the password, for example `@` becomes `%40`).
3. **Render -> New -> Blueprint** -> choose the repo. Render reads `render.yaml` and creates `book-exchange-api` and
   `book-exchange-web`. When asked, fill in:
   - `MONGODB_URI` = the Atlas string from step 2
   - `CLIENT_ORIGINS` and `VITE_API_URL` = anything for now (you need the real URLs first)
4. After the first deploy, note both URLs (Render shows them on each service), then set:
   - on **book-exchange-api**: `CLIENT_ORIGINS` = the website URL, exactly, with `https://` and **no trailing slash**
   - on **book-exchange-web**: `VITE_API_URL` = the API URL, for example `https://book-exchange-api.onrender.com`
5. Redeploy both (the website must be rebuilt for `VITE_API_URL` to take effect).
6. Open `https://<api>.onrender.com/health`, it must show `{"status":"ok"}`. Then open the website and run the manual
   click-through in section 8.

### Doing it by hand instead of the Blueprint
- **API**: New -> Web Service, root directory `backend`, build `npm install`, start `npm start`, health check path `/health`,
  environment variables as in `render.yaml`.
- **Website**: New -> Static Site, root directory `frontend`, build `npm install --include=dev && npm run build`,
  publish directory `dist`, env var `VITE_API_URL`, and a **Rewrite** rule `/*` -> `/index.html`
  (without it, refreshing on `/offers` or `/books/3` gives a 404).

### Free-plan behaviour to expect
- The API **sleeps after 15 minutes without traffic** and takes roughly 30 to 60 seconds to wake. The first page load can show
  "Couldn't load the listings"; the **Try again** button works once it is awake. Chat reconnects on its own (every 5 seconds).
- Open chat connections are dropped when the service sleeps or redeploys.
- Atlas free tier gives 512 MB, shared by data and photos.

### Troubleshooting
| Symptom | Cause |
|---|---|
| Browser console: CORS error | `CLIENT_ORIGINS` does not exactly match the website URL (check `https`, spelling, trailing slash) |
| Site loads but every request goes to `localhost:8080` | `VITE_API_URL` was not set before the build. Set it and redeploy the website |
| API logs `MongooseServerSelectionError` | Atlas Network Access is missing `0.0.0.0/0`, or the password in `MONGODB_URI` is wrong or not URL-encoded |
| API fails at start with "JWT_SECRET must be set" | the env var is missing (the Blueprint generates it) |
| Refreshing `/offers` shows "Not Found" | the website is missing the `/*` -> `/index.html` rewrite rule |
| Chat says "Connecting..." forever | the API is asleep (wait a minute) or `VITE_API_URL` points at the wrong host |
| Photos load locally but not when deployed | `VITE_API_URL` has a typo, the image URL is built from it |
