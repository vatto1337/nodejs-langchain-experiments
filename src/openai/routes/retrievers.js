import express from "express";

// Dependencies
import { CheerioWebBaseLoader } from "langchain/document_loaders/web/cheerio";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { createStuffDocumentsChain } from "langchain/chains/combine_documents";
import { createRetrievalChain } from "langchain/chains/retrieval";
import { OpenAIEmbeddings } from "@langchain/openai";
import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { HumanMessage, AIMessage } from "@langchain/core/messages";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { MessagesPlaceholder } from "@langchain/core/prompts";
import { createHistoryAwareRetriever } from "langchain/chains/history_aware_retriever";

// Import our model
import Model from "../dependencies/model.js";
import {
  answerQuestionPrompt,
  historyAwarePrompt,
  historyAwareRetrievalPrompt,
} from "../dependencies/prompts.js";
import { getDataSubjectVectorDataset } from "../dependencies/vectors.js";

let router = express.Router();

/**
 * A simple route that answers questions related to GDPR.
 */

router.get("/askQuestion", async (req, res) => {
  // We'll create a simulated vector store in the server's memory.
  const vectorStore = await getDataSubjectVectorDataset();

  // Initialize a retriever wrapper around the vector store
  const retriever = vectorStore.asRetriever();

  // This chain takes a list of documents and formats them all into a prompt, then passes that prompt to an LLM. It passes ALL documents, so you should make sure it fits within the context window the LLM you are using.
  const documentChain = await createStuffDocumentsChain({
    llm: Model,
    prompt: answerQuestionPrompt,
  });

  // Explanation: This chain takes in a user inquiry, which is then passed to the retriever to fetch relevant documents. Those documents (and original inputs) are then passed to an LLM to generate a response
  const retrievalChain = await createRetrievalChain({
    combineDocsChain: documentChain,
    retriever,
  });

  const result = await retrievalChain.invoke({
    input: "what is data subject?",
  });

  res.status(200).send(result.answer);
});

router.get("/historyAwareRetriever", async (req, res) => {
  // Get the vector dataset of knowledge about GDPR.
  const vectorStore = await getDataSubjectVectorDataset();

  // Initialize a retriever wrapper around the vector store
  const vectorRetriever = vectorStore.asRetriever();

  // Like a search. Is returning only the right documents. Is not one of those "This are the results:"
  const historyAwareRetrieverChain = await createHistoryAwareRetriever({
    llm: Model,
    retriever: vectorRetriever, // It must use the original documents as the source.
    rephrasePrompt: historyAwarePrompt,
  });

  // This chain takes a list of documents and formats them all into a prompt, then passes that prompt to an LLM. It passes ALL documents, so you should make sure it fits within the context window the LLM you are using.
  const historyAwareCombineDocsChain = await createStuffDocumentsChain({
    llm: Model,
    prompt: historyAwareRetrievalPrompt,
  });

  // Explanation: This chain takes in a user inquiry, which is then passed to the retriever to fetch relevant documents. Those documents (and original inputs) are then passed to an LLM to generate a response
  const conversationalRetrievalChain = await createRetrievalChain({
    retriever: historyAwareRetrieverChain,
    combineDocsChain: historyAwareCombineDocsChain,
  });

  const response = await conversationalRetrievalChain.invoke({
    chat_history: [
      new HumanMessage("Can privasee help me create my privacy policy?"),
      new AIMessage("Yes!"),
    ],
    input: "tell me how",
  });

  res.status(200).send(response.answer);
});

export default router;
