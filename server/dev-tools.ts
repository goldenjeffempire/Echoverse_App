import { generateContent } from './openai';

interface DevResponse {
  code?: string;
  explanation?: string;
  suggestions?: string[];
}

export async function generateDevResponse(
  prompt: string,
  systemPrompt: string
): Promise<DevResponse> {
  try {
    // Validate inputs
    if (!prompt || !systemPrompt) {
      throw new Error("Both prompt and systemPrompt are required");
    }

    // Generate content using the external API (assumed to be OpenAI)
    const { content } = await generateContent(prompt, {
      type: "code",
      context: systemPrompt,
    });

    // Attempt to parse the content as JSON and return it
    try {
      const response: DevResponse = JSON.parse(content);
      return response;
    } catch (parseError) {
      console.error("Error parsing generated content:", parseError);
      throw new Error("Failed to parse content into DevResponse format");
    }
  } catch (error) {
    console.error("Error generating dev response:", error);
    throw new Error("Failed to generate development response");
  }
}
