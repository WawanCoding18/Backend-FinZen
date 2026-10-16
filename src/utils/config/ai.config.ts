import "dotenv/config";

if (!process.env.GEMINI_API_KEY) {
  throw new Error("GEMINI_API_KEY belum di-set");
}
if (!process.env.GROQ_API_KEY) {
  throw new Error("GROQ_API_KEY belum di-set");
}

export const aiConfig = {
  gemini: {
    apiKey: process.env.GEMINI_API_KEY,
    model: "gemini-3.1-flash-lite",
  },
  groq: {
    apiKey: process.env.GROQ_API_KEY,
    model: "openai/gpt-oss-120b",
  },
};


//provider AI yang dipakai secara bergantian
export const AI_PROVIDERS = ["gemini", "groq"] as const;
export type AIProvider = (typeof AI_PROVIDERS)[number];