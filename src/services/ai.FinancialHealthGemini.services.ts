import "dotenv/config";
import { aiConfig } from "../utils/config/ai.config";
import { GoogleGenAI, Type } from "@google/genai";
import { FULL_SYSTEM_INSTRUCTION_FINANCIAL_HEALTH } from "../utils/FinancialHealth.prompts";

const aiText = new GoogleGenAI({ apiKey: aiConfig.gemini.apiKey });

export const streamGemini = async (
  message: string,
  res: any,
): Promise<void> => {
  // Ambil system instruction dinamis Financial Health
  const dynamicSystemInstruction = FULL_SYSTEM_INSTRUCTION_FINANCIAL_HEALTH;
  const userMsgLength = message?.length || 0;
  const systemPromptLength = dynamicSystemInstruction?.length || 0;

  const totalChars = userMsgLength + systemPromptLength;
  const estimatedTokens = Math.ceil(totalChars / 3.5);

  console.log("--------------------------------------------------");
  console.log("💬 [DEBUG DATA TEXT - FINANCIAL HEALTH]");
  console.log(" Panjang Pesan User   :", userMsgLength, "karakter");
  console.log(" Panjang System Prompt:", systemPromptLength, "karakter");
  console.log(" Total Karakter Teks  :", totalChars, "karakter");
  console.log(" Est. Input Tokens    : ~" + estimatedTokens, "tokens");
  console.log("--------------------------------------------------");

  //Schema SubScore untuk pilar
  const SubScoreSchema = {
    type: Type.OBJECT,
    properties: {
      skor: {
        type: Type.NUMBER,
        description: "Skor pilar (0 - 25)",
      },
      maksimal: {
        type: Type.NUMBER,
        description: "Maksimal skor pilar (default 25)",
      },
      persentase: {
        type: Type.NUMBER,
        description: "Persentase pencapaian (0 - 100)",
      },
      status: {
        type: Type.STRING,
        enum: ["Excellent", "Good", "Perlu Perhatian", "Buruk"],
        description: "Status performa pilar",
      },
      ringkasan: {
        type: Type.STRING,
        description: "Ringkasan 1-2 kalimat deskripsi kondisi pilar",
      },
      saranPerkembangan: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: "3 poin saran taktis tindakan pengguna",
      },
    },
    required: [
      "skor",
      "maksimal",
      "persentase",
      "status",
      "ringkasan",
      "saranPerkembangan",
    ],
  };

  const responseStream = await aiText.models.generateContentStream({
    model: aiConfig.gemini.model,
    contents: `Data Finansial Pengguna:\n"""${message}"""`,
    config: {
      systemInstruction: dynamicSystemInstruction,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          skorTotal: {
            type: Type.NUMBER,
            description: "Total akumulasi skor kesehatan finansial (0 - 100)",
          },
          grade: {
            type: Type.STRING,
            enum: ["A", "B", "C", "D", "E"],
            description: "Grade kelayakan finansial",
          },
          disiplinAnggaran: SubScoreSchema,
          pengelolaanPinjaman: SubScoreSchema,
        },
        required: [
          "skorTotal",
          "grade",
          "disiplinAnggaran",
          "pengelolaanPinjaman",
        ],
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