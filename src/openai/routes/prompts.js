import express from "express";

// Dependencies
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";

// Import our model
import Model from "../dependencies/model.js";

// The StringOutputParser takes language model output (either an entire response or as a stream) and converts it into a strin
const outputParser = new StringOutputParser();

let router = express.Router();

/**
 * A basic example that tells you a random joke.
 */

router.get("/jokes", async (req, res) => {
  try {
    // Define the prompt
    const prompt = ChatPromptTemplate.fromMessages([
      ["human", "Tell me a short joke about {topic}"],
    ]);

    // Create a chat..
    const chain = prompt.pipe(Model).pipe(outputParser);

    // Get response..
    const response = await chain.invoke({ topic: "ice cream" });

    return res.status(200).send(response);
  } catch (err) {
    console.log("error", err);
    return res.send(400).send("Internal Server Error");
  }
});

/**
 * An example on how to invoke a model directly with no prompt. Raw!
 */

router.get("/directModelInvoke", async (req, res) => {
  try {
    // Get the raw response
    const response = await Model.invoke(`What is the capital of Spain?`);

    // We parse it using the output parser to get a readable string.
    const parsed = await outputParser.invoke(response);

    return res.status(200).send(parsed);
  } catch (err) {
    console.log("error", err);
    return res.send(400).send("Internal Server Error");
  }
});

export default router;
