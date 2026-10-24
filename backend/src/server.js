import http from "node:http";
import { fileURLToPath } from "node:url";
import mongoose from "mongoose";
import { config } from "./config.js";
import { createApp } from "./app.js";
import { attachStomp } from "./realtime/stomp.js";

// Exported so the tests can start the whole stack on a random port
export async function startServer({ port = config.port, mongoUri = config.mongoUri } = {}) {
  await mongoose.connect(mongoUri);
  const server = http.createServer(createApp());
  attachStomp(server);
  await new Promise((resolve) => server.listen(port, resolve));

  const stop = async () => {
    await new Promise((resolve) => server.close(resolve));
    await mongoose.disconnect();
  };
  return { server, port: server.address().port, stop };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  startServer()
    .then(({ port }) => console.log(`Book Exchange API listening on http://localhost:${port}`))
    .catch((err) => {
      console.error("Failed to start:", err.message);
      process.exit(1);
    });
}
