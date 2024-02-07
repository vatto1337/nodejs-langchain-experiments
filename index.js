import express from "express";
import { config as loadEnvironmentVariables } from "dotenv";

// Express.js
const app = express();
const port = 5000;

// Load Environment variables
loadEnvironmentVariables();

// Routes
import OpenAI from "./src/openai/index.js";

app.use("/openai/prompts", OpenAI.Prompts);
app.use("/openai/retrievers", OpenAI.Retrievers);
app.use("/openai/agents", OpenAI.Agents);
app.listen(port, () => {
  console.log(`Back-end running on localhost:${port}`);
});
