import { aiConfig } from "../utils/config/ai.config";
import { streamGemini } from "./aiCariAmanGemini.services";
import { streamGroq } from "./aiCariAmanGroq";
import { RiskAnalysisSchema, RiskAnalysis } from "../utils/riskAnalisis";
import { performance } from "perf_hooks";

let currentProviderIndex = 0;
const providers = Object.keys(aiConfig) as Array<keyof typeof aiConfig>;

type StreamFunction = (
  message: string,
  ojkMatchStatus: string,
  res: any,
) => Promise<void>;

const streamFunctions: Record<keyof typeof aiConfig, StreamFunction> = {
  gemini: streamGemini,
  groq: streamGroq,
};

const recalculateScore = (data: any): number => {
  let score = 0;

  if (data.soceng_indicated) score += 40;
  if (data.manipulative_language_detected) score += 15;
  if (data.interest_warning) score += 30;
  if (data.apk_download_indicated) score += 35;
  if (data.sensitive_data_requested) score += 50;
  if (data.channel_violation_detected) score += 25;

  //Terapkan faktor ojk_match_status secara matematis secara pasti
  if (data.is_ojk_legal === "Terdaftar Resmi") {
    score = score * 0.6;
  } else if (data.is_ojk_legal === "Tidak Ditemukan") {
    score = score * 1.2;
  }

  return Math.min(100, Math.max(0, Math.round(score)));
};

const processRiskData = (parsedJson: any): RiskAnalysis => {
  //Hitung ulang risk_score dari flag boolean — Abaikan angka yang dikasih AI
  parsedJson.risk_score = recalculateScore(parsedJson);

  //Mencegah kontradiksi: scam/soceng true tapi skornya kebetulan masih rendah
  if (
    (parsedJson.is_scam_indicated || parsedJson.soceng_indicated) &&
    parsedJson.risk_score < 20
  ) {
    parsedJson.risk_score = 20;
  }

  //Sinkronkan risk_level dari risk_score
  if (parsedJson.risk_score >= 60) {
    parsedJson.risk_level = "berbahaya";
  } else if (parsedJson.risk_score >= 20) {
    parsedJson.risk_level = "waspada";
  } else {
    parsedJson.risk_level = "aman";
  }

  if (parsedJson.sensitive_data_requested) {
    parsedJson.risk_level = "berbahaya";
    parsedJson.risk_score = Math.max(parsedJson.risk_score, 60);
  }

  //Validasi skema Zod
  const validation = RiskAnalysisSchema.safeParse(parsedJson);
  if (!validation.success) {
    throw new Error(
      `JSON tidak sesuai skema: ${JSON.stringify(validation.error.issues)}`,
    );
  }

  return validation.data;
};

const attemptProvider = async (
  provider: keyof typeof aiConfig,
  message: string,
  ojkMatchStatus: string,
  res: any,
): Promise<{
  success: boolean;
  hasSentChunk: boolean;
  result?: RiskAnalysis;
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
        if (parsed.type === "answer") {
          fullAnswerText += parsed.text;
          hasSentChunk = true;
        }
      } catch (e) {}
    }

    return originalWrite(chunk, encoding, callback);
  };

  console.log(`\n==================================================`);
  console.log(
    `🤖 [START] Melakukan giliran Stream Teks via: [${provider.toUpperCase()}]`,
  );
  console.log(`==================================================`);

  try {
    await streamFunctions[provider](message, ojkMatchStatus, res);

    let parsedJson: any;
    try {
      parsedJson = JSON.parse(fullAnswerText);
    } catch (e) {
      throw new Error(
        `Output bukan JSON valid: ${fullAnswerText.slice(0, 200)}`,
      );
    }

    const validResult = processRiskData(parsedJson);

    //Hitung durasi mentah dalam ms
    const durationMs = performance.now() - startTime;
    const durationSec = (durationMs / 1000).toFixed(2);

    console.log(`\n📊 [REKAPITULASI PROSES AI TEKS]`);
    console.log(`├─ Provider Terpilih : ${provider.toUpperCase()}`);
    console.log(
      `├─ Waktu Respons     : ${durationMs.toFixed(2)} ms (${durationSec} detik)`,
    );
    console.log(
      `└─ Hasil JSON Valid  :\n${JSON.stringify(validResult, null, 2)}`,
    );
    console.log(`==================================================\n`);
    return { success: true, hasSentChunk, result: validResult };
  } catch (error: any) {
    const duration = (performance.now() - startTime).toFixed(2);
    console.error(
      `❌ [ERROR] Gagal pada ${provider.toUpperCase()} (${duration} ms): ${error.message}`,
    );
    return { success: false, hasSentChunk, error };
  } finally {
    res.write = originalWrite;
  }
};

//Stream Teks
export const askAIStream = async (
  message: string,
  ojkMatchStatus: string,
  res: any,
): Promise<RiskAnalysis> => {
  let lastError: any;

  for (let i = 0; i < providers.length; i++) {
    const provider = providers[currentProviderIndex];
    currentProviderIndex = (currentProviderIndex + 1) % providers.length;

    const result = await attemptProvider(
      provider,
      message,
      ojkMatchStatus,
      res,
    );

    if (result.success && result.result) {
      return result.result;
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
