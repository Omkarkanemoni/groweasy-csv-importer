/**
 * Thin abstraction over "call an LLM with a system+user prompt, get text
 * back". Swapping providers should only ever mean touching this file -
 * nothing else in the codebase should know or care which LLM is in use.
 */

let openaiClient = null;
function getOpenAiClient() {
  if (!openaiClient) {
    const OpenAI = require("openai");
    openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return openaiClient;
}

async function callOpenAi(systemPrompt, userPrompt) {
  const client = getOpenAiClient();
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

  const response = await client.chat.completions.create({
    model,
    temperature: 0,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
  });

  return response.choices[0]?.message?.content || "";
}

let geminiClient = null;
function getGeminiClient() {
  if (!geminiClient) {
    // Uses the current, actively-maintained Google Gen AI SDK.
    // (The older "@google/generative-ai" package is deprecated as of Nov 2025 -
    // don't install that one.)
    const { GoogleGenAI } = require("@google/genai");
    geminiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return geminiClient;
}

async function callGemini(systemPrompt, userPrompt) {
  const client = getGeminiClient();
  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";

  const response = await client.models.generateContent({
    model,
    contents: userPrompt,
    config: {
      systemInstruction: systemPrompt,
      temperature: 0,
      responseMimeType: "application/json",
    },
  });

  return response.text || "";
}

async function callAnthropic(systemPrompt, userPrompt) {
  // Left as a clear extension point. Example wiring with @anthropic-ai/sdk:
  //
  // const Anthropic = require("@anthropic-ai/sdk");
  // const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  // const msg = await client.messages.create({
  //   model: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6",
  //   max_tokens: 4096,
  //   system: systemPrompt,
  //   messages: [{ role: "user", content: userPrompt }],
  // });
  // return msg.content.map((b) => (b.type === "text" ? b.text : "")).join("");
  throw new Error(
    "Anthropic provider not wired up. Install @anthropic-ai/sdk and implement callAnthropic() in src/services/aiProvider.js."
  );
}

/**
 * Calls the configured provider and returns the raw text response.
 */
async function callAi(systemPrompt, userPrompt) {
  const provider = (process.env.AI_PROVIDER || "openai").toLowerCase();

  switch (provider) {
    case "openai":
      return callOpenAi(systemPrompt, userPrompt);
    case "gemini":
      return callGemini(systemPrompt, userPrompt);
    case "anthropic":
      return callAnthropic(systemPrompt, userPrompt);
    default:
      throw new Error(`Unknown AI_PROVIDER "${provider}". Use openai, gemini, or anthropic.`);
  }
}

module.exports = { callAi };
