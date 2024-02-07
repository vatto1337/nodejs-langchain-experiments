import { OpenAIEmbeddings } from "@langchain/openai";
import { CheerioWebBaseLoader } from "langchain/document_loaders/web/cheerio";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { MemoryVectorStore } from "langchain/vectorstores/memory";

let vectors = {};

// We'll use this to generate Embeddings
const embeddings = new OpenAIEmbeddings();

/**
 * A simple function that returns a vector store full of knowledge of what is a data subject/
 * @returns
 */

export const getDataSubjectVectorDataset = async () => {
  // If is alreadyu cached let's not waste embeddings.
  if (vectors["dataSubject"]) return vectors["dataSubject"];

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

  vectors["dataSubject"] = vectorstore;

  return vectorstore;
};
