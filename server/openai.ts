import { OpenAI } from "openai";
import { db } from "./db";  // Your Prisma or database client
import { aiContents } from "./models";  // Assuming you have an AI content model defined
import dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

// Ensure environment variables are loaded
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
if (!OPENAI_API_KEY) {
  throw new Error("OPENAI_API_KEY is missing from the environment variables.");
}

// Define OpenAI API client
const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,  // Use the environment variable for API key
});

/**
 * Default values for the OpenAI calls
 */
const DEFAULT_MODEL = "text-davinci-003"; // Default model
const DEFAULT_TEMPERATURE = 0.7;         // Default temperature for responses

/**
 * Function to create embeddings for semantic search
 */
export async function createEmbedding(text: string): Promise<number[]> {
  try {
    const response = await openai.embeddings.create({
      model: "text-embedding-ada-002", // Default embedding model
      input: text,
    });

    const embeddings = response.data[0].embedding || [];
    
    return embeddings;
  } catch (error) {
    console.error("OpenAI API error:", error);
    throw new Error("Failed to create embeddings.");
  }
}

/**
 * Function to handle generic OpenAI API calls
 */
export async function makeOpenAICall(
  prompt: string,
  options: {
    model?: string;
    temperature?: number;
    max_tokens?: number;
    userId?: number;
  } = {}
): Promise<string> {
  try {
    const model = options.model || DEFAULT_MODEL;
    const temperature = options.temperature || DEFAULT_TEMPERATURE;
    const maxTokens = options.max_tokens || 500;

    const response = await openai.completions.create({
      model,
      prompt,
      temperature,
      max_tokens: maxTokens,
    });

    const content = response.choices[0].text || "I'm not sure how to respond to that.";
    
    // Log to database if userId is provided
    if (options.userId) {
      await db.insert(aiContents).values({
        userId: options.userId,
        type: "openai_call",
        prompt,
        content,
        createdAt: new Date(),
      });
    }

    return content;
  } catch (error) {
    console.error("OpenAI API error:", error);
    throw new Error("Failed to make OpenAI API call.");
  }
}

/**
 * Optional function for generating responses based on a given context (e.g., for chat-like behavior)
 */
export async function generateChatResponse(
  conversationHistory: string[],
  options: {
    model?: string;
    temperature?: number;
    max_tokens?: number;
    userId?: number;
  } = {}
): Promise<string> {
  const prompt = conversationHistory.join("\n"); // Join all messages in the conversation

  return makeOpenAICall(prompt, options);
}

/**
 * Optional function for generating responses based on a template or predefined structure
 */
export async function generateTemplateResponse(
  template: string,
  data: Record<string, any>,
  options: {
    model?: string;
    temperature?: number;
    max_tokens?: number;
    userId?: number;
  } = {}
): Promise<string> {
  const prompt = template.replace(/\{(\w+)\}/g, (_, key) => data[key] || `{${key}}`); // Replace placeholders with data

  return makeOpenAICall(prompt, options);
}
