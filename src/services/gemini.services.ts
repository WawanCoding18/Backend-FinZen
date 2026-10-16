import "dotenv/config";
import { aiConfig } from "../utils/config/ai.config";
import { GoogleGenAI, Type } from "@google/genai";
import { getFullSystemInstruction } from "../utils/prompts";

const aiText = new GoogleGenAI({ apiKey: aiConfig.gemini.apiKey });

export const streamGemini = async (
  message: string,
  res: any,
): Promise<void> => {
  const dynamicSystemInstruction = getFullSystemInstruction();

  const userMsgLength = message?.length || 0;
  const systemPromptLength = dynamicSystemInstruction?.length || 0;

  const totalChars = userMsgLength + systemPromptLength;
  const estimatedTokens = Math.ceil(totalChars / 3.5);

  console.log("--------------------------------------------------");
  console.log("💬 [DEBUG DATA TEXT]");
  console.log(" Panjang Pesan User   :", userMsgLength, "karakter");
  console.log(" Panjang System Prompt:", systemPromptLength, "karakter");
  console.log(" Total Karakter Teks  :", totalChars, "karakter");
  console.log(" Est. Input Tokens    : ~" + estimatedTokens, "tokens");
  console.log("--------------------------------------------------");

  const responseStream = await aiText.models.generateContentStream({
    model: aiConfig.gemini.model,
    contents: `Teks/hasil OCR dari pengguna:\n"""${message}"""`,
    config: {
      systemInstruction: dynamicSystemInstruction,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          Catatan_Transaksi: {
            type: Type.STRING,
            description: "Ringkasan barang/item yang dibeli user, dipisah koma",
          },
          tipe: {
            type: Type.STRING,
            enum: ["pengeluaran", "pemasukan"],
          },
          kategori: {
            type: Type.STRING,
            enum: [
              "Hiburan",
              "Makanan",
              "Transportasi",
              "Belanja",
              "Tagihan",
              "Kesehatan",
              "Gaji",
              "Freelance",
              "Part-time",
              "Investasi",
              "Lainnya",
            ],
          },
          Sumber_Dana: {
            type: Type.STRING,
            enum: [
              "Tunai",
              "Gopay",
              "DANA",
              "ShopeePay",
              "Bank Mandiri",
              "BSI",
              "BRI",
              "BTN",
              "BSA",
              "OVO",
              "Lainnya",
            ],
            description:
              "Metode pembayaran yang dipakai user (misal 'Tunai', 'Gopay'). BUKAN nama toko/brand/merchant. Jika tidak jelas dari teks, isi 'Lainnya'.",
          },
          nominal: {
            type: Type.NUMBER,
            description: "Nilai total bayar, angka murni tanpa titik/koma",
          },
          tanggal: {
            type: Type.STRING,
            description:
              "Format YYYY-MM-DD. Wajib mengunci tanggal dari OCR jika ada (contoh '16.06.18' -> '2018-06-16', '05.09.17' -> '2017-09-05'). Jika tidak ada, gunakan tanggal hari ini dari prompt.",
          },
        },
        required: [
          "Catatan_Transaksi",
          "tipe",
          "kategori",
          "Sumber_Dana",
          "nominal",
          "tanggal",
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
