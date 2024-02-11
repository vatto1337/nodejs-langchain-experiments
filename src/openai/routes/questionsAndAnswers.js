import express from "express";

// OpenAI
import { ChatOpenAI, OpenAIEmbeddings } from "@langchain/openai";

// Pinecone
import { Pinecone } from "@pinecone-database/pinecone";
import { PineconeStore } from "@langchain/pinecone";
import { pull } from "langchain/hub";
import { AgentExecutor, createOpenAIToolsAgent } from "langchain/agents";
import { agentSearchPrompt } from "../dependencies/prompts.js";
import { createRetrieverTool } from "langchain/tools/retriever";
import Model from "../dependencies/model.js";
import { StringOutputParser } from "@langchain/core/output_parsers";

let router = express.Router();
// The StringOutputParser takes language model output (either an entire response or as a stream) and converts it into a strin
const outputParser = new StringOutputParser();

// Pinecone
const pinecone = new Pinecone();
const pineconeIndex = pinecone.Index(process.env.PINECONE_INDEX);
const llm = new ChatOpenAI({ temperature: 0, modelName: "gpt-3.5-turbo" });

router.get("/search/pet/:searchText", async (req, res) => {
  try {
    const { searchText } = req.params;
    console.log(`started: ${new Date().toISOString()}`);

    // Get the vector store to search questions
    const vectorStore = await PineconeStore.fromExistingIndex(
      new OpenAIEmbeddings(),
      { pineconeIndex }
    );

    // Get the retriever
    const retriever = vectorStore.asRetriever();

    // Create "a tool" that the LLM can use when he needs to retrieve GDPR related articles.
    const tool = createRetrieverTool(retriever, {
      name: "search_documents",
      description: "Searches for documents in the database", // 🔎 This is important: This is helpful for the AI To understand the purpose of the "tool"
    });

    const tools = [tool];

    // We now create the agent.
    const agent = await createOpenAIToolsAgent({
      llm,
      tools,
      prompt: agentSearchPrompt,
    });

    // A chain managing the agent and its available tools.
    const agentExecutor = new AgentExecutor({ agent, tools });

    console.log("invoke");
    const result = await agentExecutor.invoke({
      input: searchText,
    });

    console.log(`finshed: ${new Date().toISOString()}`);

    return res.status(200).send(result);
  } catch (err) {
    console.log("Error", err);
  }
});

export default router;
