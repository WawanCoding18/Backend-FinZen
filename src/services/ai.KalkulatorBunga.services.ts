import { aiConfig } from "../utils/config/ai.config";
import { streamGemini } from "./ai.KalkulatorBungaGemini.services";
import { streamGroq } from "./ai.KalkulatorBungaGroq.services";
import { performance } from "perf_hooks";

//Config & Provider Teks
let currentProviderIndex = 0;
const providers = Object.keys(aiConfig) as Array<keyof typeof aiConfig>;

//Tipe Data Fungsi Stream
type StreamFunction = (
  message: string,
  res: any,
) => Promise<void>;

//Fungsi Stream
const streamFunctions: Record<keyof typeof aiConfig, StreamFunction> = {
  gemini: streamGemini,
  groq: streamGroq,
};

const attemptProvider = async (
  provider: keyof typeof aiConfig,
  message: string,
  res: any,
): Promise<{
  success: boolean;
  hasSentChunk: boolean;
  result?: any;
  error?: any;
}> => {
  const startTime = performance.now();
  let fullAnswerText = "";
  let hasSentChunk = false;

  const originalWrite = res.write.bind(res);

  res.write = (chunk: any, encoding?: any, callback?: any) => {
    const chunkStr = chunk.toString();

    if (chunkStr.startsWith("data: ") && !chunkStr.includes("[DONE]")) {
      try {
        const parsed = JSON.parse(chunkStr.slice(6));
        if (parsed.type === "answer" && parsed.text) {
          fullAnswerText += parsed.text; 
          hasSentChunk = true;
        }
      } catch (e) {

      }
    }

    return originalWrite(chunk, encoding, callback);
  };

  console.log(`\n==================================================`);
  console.log(`🤖 [START] Melakukan giliran Stream Teks via: [${provider.toUpperCase()}]`);
  console.log(`==================================================`);

  try {
    //Jalankan proses streaming sampai selesai total
    await streamFunctions[provider](message, res);

    let validResult: any;
    try {
      const cleanJsonStr = fullAnswerText
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/\s*```$/, "")
        .trim();

      validResult = JSON.parse(cleanJsonStr);
    } catch (e: any) {
      throw new Error(
        `Output stream selesai tapi bukan JSON valid: ${fullAnswerText.slice(0, 200)}`
      );
    }

    const durationMs = performance.now() - startTime;
    const durationSec = (durationMs / 1000).toFixed(2);

    console.log(`\n📊 [REKAPITULASI PROSES AI TEKS]`);
    console.log(`├─ Provider Terpilih : ${provider.toUpperCase()}`);
    console.log(`├─ Waktu Respons     : ${durationMs.toFixed(2)} ms (${durationSec} detik)`);
    console.log(`└─ Hasil JSON Valid  :\n${JSON.stringify(validResult, null, 2)}`);
    console.log(`==================================================\n`);

    return { success: true, hasSentChunk, result: validResult };
  } catch (error: any) {
    const duration = (performance.now() - startTime).toFixed(2);
    console.error(
      `❌ [ERROR] Gagal pada ${provider.toUpperCase()} (${duration} ms): ${error.message}`
    );
    return { success: false, hasSentChunk, error };
  } finally {
    res.write = originalWrite;
  }
};

//Stream Teks Utama
export const askAIStream = async (
  message: string,
  res: any,
): Promise<any> => {
  let lastError: any;

  for (let i = 0; i < providers.length; i++) {
    const provider = providers[currentProviderIndex];
    currentProviderIndex = (currentProviderIndex + 1) % providers.length;

    const result = await attemptProvider(
      provider,
      message,
      res,
    );

    if (result.success && result.result) {
      return result.result; //Mengembalikan hasil JSON valid
    }

    lastError = result.error;

    if (result.hasSentChunk) {
      console.warn(
        `⚠️ [WARN] Provider ${provider.toUpperCase()} mengirim chunk tapi JSON tidak valid.`,
      );
      console.warn(`🔄 Tetap mencoba provider berikutnya sebagai fallback...`);
    } else {
      console.log(
        `🔄 Belum ada jawaban terkirim, mencoba provider berikutnya...`,
      );
    }
  }

  throw new Error(
    `Semua provider teks gagal. Error terakhir: ${
      lastError?.message || lastError
    }`,
  );
};