import "dotenv/config";
import { aiConfig } from "../utils/config/ai.config";
import { GoogleGenAI, Type } from "@google/genai";
import { FULL_SYSTEM_INSTRUCTION_KALKULATOR_BUNGA } from "../utils/KalkulatorBunga.prompts";

const aiText = new GoogleGenAI({ apiKey: aiConfig.gemini.apiKey });

export const streamGemini = async (
  message: string,
  res: any,
): Promise<void> => {
  const dynamicSystemInstruction = FULL_SYSTEM_INSTRUCTION_KALKULATOR_BUNGA;
  const userMsgLength = message?.length || 0;
  const systemPromptLength = dynamicSystemInstruction?.length || 0;

  const totalChars = userMsgLength + systemPromptLength;
  const estimatedTokens = Math.ceil(totalChars / 3.5);

  console.log("--------------------------------------------------");
  console.log("💬 [DEBUG DATA TEXT - KALKULATOR BUNGA]");
  console.log(" Panjang Pesan User   :", userMsgLength, "karakter");
  console.log(" Panjang System Prompt:", systemPromptLength, "karakter");
  console.log(" Total Karakter Teks  :", totalChars, "karakter");
  console.log(" Est. Input Tokens    : ~" + estimatedTokens, "tokens");
  console.log("--------------------------------------------------");

  const responseStream = await aiText.models.generateContentStream({
    model: aiConfig.gemini.model,
    contents: `Data/Hasil Kalkulasi Pinjaman Pengguna:\n"""${message}"""`,
    config: {
      systemInstruction: dynamicSystemInstruction,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          levelRisiko: {
            type: Type.STRING,
            enum: ["Rendah", "Sedang", "Tinggi"],
            description:
              "Tingkat risiko pinjaman berdasarkan persentase bunga dan beban denda.",
          },
          analisisAI: {
            type: Type.STRING,
            description:
              "Narasi singkat, solutif, dan komunikatif terkait analisis risiko dan rekomendasi tindakan (boleh menggunakan markdown **bold** untuk poin penting).",
          },
        },
        required: ["levelRisiko", "analisisAI"],
      },
      temperature: 0.0,
      maxOutputTokens: 2048,
    },
  });

  for await (const chunk of responseStream) {
    const parts = chunk.candidates?.[0]?.content?.parts || [];
    for (const part of parts) {
      if (part.text) {
        res.write(
          `data: ${JSON.stringify({ type: "answer", text: part.text })}\n\n`,
        );
      }
    }
  }
};
