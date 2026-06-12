import { embed } from "ai";
import { createOpenAI } from "@ai-sdk/openai";

const getOpenAIClient = () => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  return createOpenAI({ apiKey });
};

/**
 * Generates a 1536-dimensional embedding using OpenAI text-embedding-3-small.
 */
export async function getEmbedding(text: string): Promise<number[] | null> {
  const client = getOpenAIClient();
  if (!client) {
    console.warn("[Embeddings] OPENAI_API_KEY is not configured. Embedding skipped.");
    return null;
  }

  try {
    const { embedding } = await embed({
      model: client.embedding("text-embedding-3-small"),
      value: text.replace(/\n/g, " "),
    });
    return embedding;
  } catch (error) {
    console.error("[Embeddings] Error generating embedding:", error);
    return null;
  }
}

/**
 * Formats a numeric array embedding into a pgvector string representation: '[val1,val2,...]'
 */
export function formatVector(embedding: number[] | null): string | null {
  if (!embedding) return null;
  return `[${embedding.join(",")}]`;
}
