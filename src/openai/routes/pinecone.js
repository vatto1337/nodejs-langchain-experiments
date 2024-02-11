import express from "express";

// Dependencies
import { Pinecone } from "@pinecone-database/pinecone";
import { Document } from "@langchain/core/documents";

import { OpenAIEmbeddings } from "@langchain/openai";
import { PineconeStore } from "@langchain/pinecone";
import { fakePetQuestions } from "../dependencies/mockups.js";

// Pinecone
const pinecone = new Pinecone();
const pineconeIndex = pinecone.Index(process.env.PINECONE_INDEX);

let router = express.Router();

/**
 * This will set the embeddings in the pinecone store.
 */

router.get("/addDocuments", async (req, res) => {
  // The documents in order to be set in the DB muist be following the format of metadat and pageContent.
  const docs = fakePetQuestions.map(
    (c) =>
      new Document({
        metadata: { id: c.id, type: "pet" },
        pageContent: `Question: ${c.title}\nAnswer: ${c.content}`,
      })
  );

  // We now add the documents in.
  await PineconeStore.fromDocuments(docs, new OpenAIEmbeddings(), {
    pineconeIndex,
    maxConcurrency: 5, // Maximum number of batch requests to allow at once. Each batch is 1000 vectors.
  });

  return res.status(200).send("Success");
});

router.get("/searchDocument/:searchText", async (req, res) => {
  const { searchText } = req.params;

  // Get the vector store that already exists
  const vectorStore = await PineconeStore.fromExistingIndex(
    new OpenAIEmbeddings(),
    { pineconeIndex }
  );

  /* Search the DB for this one. */
  // Reminder: the third param can be filters. If you add to metadata a filter like "type": "pets" you can search only through those.
  const results = await vectorStore.similaritySearch(searchText, 1, {
    type: "pet",
  });

  return res.status(200).send(results);
});

/**
 * Delete all the documents from a pinnecone index.
 */

router.get("/deleteDocuments", async (req, res) => {
  // Get the pinecone store
  const pineconeStore = new PineconeStore(new OpenAIEmbeddings(), {
    pineconeIndex,
  });

  // Delete all documents
  await pineconeStore.delete({
    deleteAll: true,
  });

  return res.status(200).send("Done, deleted.");
});

router.get("/deleteDocument/:id", async (req, res) => {
  // Get the pinecone store
  const pineconeStore = new PineconeStore(new OpenAIEmbeddings(), {
    pineconeIndex,
  });

  // This is the pinecone db id. In a real life production you would need to keep track of that unless you have non-starter plan.
  await pineconeStore.delete({
    ids: ["c28a8500-ed00-478d-8573-5a3b45d7fe56"],
  });

  // Delete all documents when you're not on starter plan. Free plan doesn't support that.
  // await pineconeStore.delete({
  //   filter: {
  //     id: req.params.id,
  //   },
  // });

  return res.status(200).send("Done, deleted.");
});

export default router;
