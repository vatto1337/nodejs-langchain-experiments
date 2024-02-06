import { config as loadEnvironmentVariables } from "dotenv";

// Load Environment variables
loadEnvironmentVariables();

import { ChatOpenAI } from "@langchain/openai";

const model = new ChatOpenAI({
  openAIApiKey: process.env.OPENAI_API_KEY,
  temperature: 0.9,
  maxTokens: 400,
});

export default model;
