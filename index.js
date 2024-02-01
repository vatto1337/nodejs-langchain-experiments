import express from "express";
import { config as loadEnvironmentVariables } from "dotenv";

// Express.js
const app = express();
const port = 5000;

// Load Environment variables
loadEnvironmentVariables();

// Routes
import OpenAI from "./routes/openai/index.js";

app.use("/openai", OpenAI);

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.listen(port, () => {
  console.log(`Back-end running on localhost:${port}`);
});
