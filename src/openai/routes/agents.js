import express from "express";

// Import our model
import { createRetrieverTool } from "langchain/tools/retriever";
import { getDataSubjectVectorDataset } from "../dependencies/vectors.js";
import { pull } from "langchain/hub";
import { ChatOpenAI } from "@langchain/openai";
import { TavilySearchResults } from "@langchain/community/tools/tavily_search";
import { DynamicTool } from "@langchain/core/tools";

import { createOpenAIToolsAgent, AgentExecutor } from "langchain/agents";

let router = express.Router();
const llm = new ChatOpenAI({ temperature: 0 });

/**
 * A simple agent that is a wizard about GDPR.
 */

router.get("/bobLegalWizard", async (req, res) => {
  // We'll create a simulated vector store in the server's memory.
  const vectorStore = await getDataSubjectVectorDataset();

  // Initialize a retriever wrapper around the vector store
  const retriever = vectorStore.asRetriever();

  const searchTool = new TavilySearchResults();

  // Create "a tool" that the LLM can use when he needs to retrieve GDPR related articles.
  const articleReadearTool = createRetrieverTool(retriever, {
    name: "read_blog_Article",
    description:
      "A tool that allows you to search through helpful GDPR related Articles.", // 🔎 This is important: This is helpful for the AI To understand the purpose of the "tool"
  });

  const customTool = new DynamicTool({
    name: "get_magic_world",
    description: "Returns the magic word.",
    func: async (input) => {
      console.log(input); // I was curious. It's undefined it seems.

      return `Bazoonga!`;
    },
  });

  // Define the array of tools

  const tools = [articleReadearTool, searchTool, customTool];

  // We now use a prompt. Is standard: https://smith.langchain.com/hub/hwchase17/openai-tools-agent
  // Is a "you're a helpful assistant" prompt.e
  const prompt = await pull("hwchase17/openai-tools-agent");

  // We now create the agent.
  const agent = await createOpenAIToolsAgent({ llm, tools, prompt });

  // 🧠 Definition: How does the agent know what tools it can use? In this case we're relying on OpenAI function calling LLMs, which take functions as a separate argument and have been specifically trained to know when to invoke those functions.

  // A chain managing the agent and its available tools.
  const agentExecutor = new AgentExecutor({ agent, tools });

  const result = await agentExecutor.invoke({
    input:
      "hi im bob. what is a 'natural person'? in terms of GDPR? Also who is the king of UK now? Also what is the magic word?",
  });

  res.status(200).send(result);
});

export default router;
