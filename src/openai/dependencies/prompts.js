import { ChatPromptTemplate } from "@langchain/core/prompts";
import { MessagesPlaceholder } from "@langchain/core/prompts";

export const answerQuestionPrompt =
  ChatPromptTemplate.fromTemplate(`Answer the following question based only on the provided context:

<context>
{context}
</context>

Question: {input}`);

export const historyAwareRetrievalPrompt = ChatPromptTemplate.fromMessages([
  [
    "system",
    "Answer the user's questions based on the below context:\n\n{context}",
  ],
  new MessagesPlaceholder("chat_history"),
  ["user", "{input}"],
]);

export const historyAwarePrompt = ChatPromptTemplate.fromMessages([
  [
    "system",
    "Given the above conversation, generate a search query to look up in order to get information relevant to the conversation",
  ],
  new MessagesPlaceholder("chat_history"),
  ["user", "{input}"],
]);

export const agentSearchPrompt = ChatPromptTemplate.fromMessages([
  [
    "system",
    "You are an assistant meant for a similarity search task. You must search for documents containing similarity to the user input.",
  ],
  [
    "system",
    "Your response response should follow this format of a JSON Array, like this: [Document ID1, Document ID2, ...].",
  ],
  [
    "assistant",
    "The document IDs are to be found in the metadata of the corresponding documents.",
  ],
  // What we're searching for..
  ["user", `{input}`],
  // The Agent will store the queries here.
  new MessagesPlaceholder("agent_scratchpad"),
]);
