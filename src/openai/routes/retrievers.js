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
  historyAwareRetrievalPrompt,
} from "../dependencies/prompts.js";

// We'll use this to generate Embeddings
const embeddings = new OpenAIEmbeddings();

let router = express.Router();

/**
 * A simple route that answers questions related to GDPR.
 */

router.get("/askQuestion", async (req, res) => {
  // We create the cheerio loader. Like a scrapper.
  const loader = new CheerioWebBaseLoader(
    "https://www.privasee.io/post/who-is-a-data-subject"
  );

  // Extract the content from that website.
  const docs = await loader.load();

  // @Reminder: The original content is too long so we need to use a splitter to splice the content into chunks.
  const splitter = new RecursiveCharacterTextSplitter();

  // We now split it.. poof!
  const splitDocs = await splitter.splitDocuments(docs);

  // We'll create a simulated vector store in the server's memory.
  const vectorstore = await MemoryVectorStore.fromDocuments(
    splitDocs, // The docs that need to be loaded in the vector store (db of embeddings)
    embeddings // Embedding methopd
  );

  // Initialize a retriever wrapper around the vector store
  const retriever = vectorstore.asRetriever();

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
  // We create the cheerio loader. Like a scrapper.
  const loader = new CheerioWebBaseLoader(
    "https://www.privasee.io/post/who-is-a-data-subject"
  );

  // Extract the content from that website.
  const docs = await loader.load();

  // @Reminder: The original content is too long so we need to use a splitter to splice the content into chunks.
  const splitter = new RecursiveCharacterTextSplitter();

  // We now split it.. poof!
  const splitDocs = await splitter.splitDocuments(docs);

  // We'll create a simulated vector store in the server's memory.
  const vectorstore = await MemoryVectorStore.fromDocuments(
    splitDocs, // The docs that need to be loaded in the vector store (db of embeddings)
    embeddings // Embedding methopd
  );

  // Initialize a retriever wrapper around the vector store
  const vectorRetriever = vectorstore.asRetriever();

  const historyAwarePrompt = ChatPromptTemplate.fromMessages([
    new MessagesPlaceholder("chat_history"),
    ["user", "{input}"],
    [
      "user",
      "Given the above conversation, generate a search query to look up in order to get information relevant to the conversation",
    ],
  ]);

  // This is a chain meant to perform a query on the documents above and return the right documents.
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
