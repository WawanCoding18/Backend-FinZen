import { Response } from "express";
import { IReqUser } from "../middlewares/auth.Middleware";
import { askAIStream } from "../services/aiCariAman.services";
import { checkOjkLegality } from "../services/ojk.services";
import connect from "../utils/database";
import CariAmanModel from "../models/cariAman.model";
import mongoose from "mongoose";

const autoSaveCariAman = async (
  userId: string | mongoose.Types.ObjectId | undefined,
  result: any
) => {
  console.log("🔍 [DEBUG CARI AMAN SAVE] Checking params:", {
    userId,
    hasResult: !!result,
  });

  const rawUserId =
    userId instanceof mongoose.Types.ObjectId
      ? userId
      : userId || "66b123456789012345678901";
  const targetUserId =
    rawUserId instanceof mongoose.Types.ObjectId
      ? rawUserId
      : new mongoose.Types.ObjectId(rawUserId);

  if (!result) {
    console.warn(
      "⚠️ [CARI AMAN SAVE SKIPPED] Function askAIStream tidak mengembalikan return object result."
    );
    return null;
  }


  const rawRiskLevel = (result.risk_level || result.riskLevel || "").toLowerCase();
  let validRiskLevel: "aman" | "waspada" | "berbahaya" = "waspada";

  if (rawRiskLevel.includes("aman") || rawRiskLevel.includes("rendah")) {
    validRiskLevel = "aman";
  } else if (rawRiskLevel.includes("bahaya") || rawRiskLevel.includes("tinggi")) {
    validRiskLevel = "berbahaya";
  } else {
    validRiskLevel = "waspada";
  }

  const rawOjkLegal = result.is_ojk_legal || result.isOjkLegal;
  const validOjkLegal: "Terdaftar Resmi" | "Tidak Ditemukan" =
    rawOjkLegal === "Terdaftar Resmi" || rawOjkLegal === true
      ? "Terdaftar Resmi"
      : "Tidak Ditemukan";

  try {
    const savedEntry = await CariAmanModel.create({
      userId: targetUserId,
      riskScore: result.risk_score ?? result.riskScore ?? 0,
      riskLevel: validRiskLevel,
      isScamIndicated: Boolean(result.is_scam_indicated ?? result.isScamIndicated),
      isOjkLegal: validOjkLegal,

      interestWarning: Boolean(result.interest_warning ?? result.interestWarning),
      manipulativeLanguageDetected: Boolean(
        result.manipulative_language_detected ?? result.manipulativeLanguageDetected
      ),
      sensitiveDataRequested: Boolean(
        result.sensitive_data_requested ?? result.sensitiveDataRequested
      ),
      socengIndicated: Boolean(result.soceng_indicated ?? result.socengIndicated),
      apkDownloadIndicated: Boolean(
        result.apk_download_indicated ?? result.apkDownloadIndicated
      ),
      channelViolationDetected: Boolean(
        result.channel_violation_detected ?? result.channelViolationDetected
      ),

      //output dari AI
      aiSummary: result.ai_summary || result.aiSummary || "Tidak ada ringkasan",
      aiDetail: result.ai_detail || result.aiDetail || "Tidak ada detail analisis",
      aiRecommendation:
        result.ai_recommendation || result.aiRecommendation || "Tidak ada rekomendasi",
    });

    console.log(
      `✅ [CARI AMAN SAVE SUCCESS] Berhasil simpan ke DB! ID: ${savedEntry._id} | Risk: ${validRiskLevel}`
    );

    console.log("=================== 📍 LOKASI PENYIMPANAN DB ===================");
    console.log("🌐 Host Mongo :", CariAmanModel.db.host);
    console.log("📁 Nama DB   :", CariAmanModel.db.name);
    console.log("📂 Collection:", CariAmanModel.collection.name);
    console.log("🆔 Document ID:", savedEntry._id);
    console.log("================================================================");
    return savedEntry;
  } catch (err) {
    console.error("❌ [CARI AMAN SAVE ERROR] Gagal menyimpan ke MongoDB:", err);
    return null;
  }
};


export const postCariAman = async (req: IReqUser, res: Response) => {
  const userId = req.user?.id;
  const { message } = req.body;

  if (!message || typeof message !== "string" || message.trim().length === 0) {
    return res.status(400).json({ error: "Message tidak boleh kosong" });
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  try {
    await connect();

    const ojkResult = await checkOjkLegality(message);

    const result = await askAIStream(
      message,
      ojkResult.is_ojk_legal ? "Terdaftar Resmi" : "Tidak Ditemukan",
      res
    );

    const savedEntry = await autoSaveCariAman(userId, result);

    res.write(
      `data: ${JSON.stringify({ type: "done", result: savedEntry || result })}\n\n`
    );
  } catch (error: any) {
    console.error("❌ Error pada postCariAman:", error.message);
    res.write(
      `data: ${JSON.stringify({
        type: "error",
        text: "Gagal menganalisis pesan, silakan coba lagi",
        error: String(error.message || error),
      })}\n\n`
    );
  } finally {
    res.end();
  }
};


export const getCariAman = async (req: IReqUser, res: Response) => {
  try {
    const rawUserId = req.user?.id || "66b123456789012345678901";
    const targetUserId = new mongoose.Types.ObjectId(rawUserId);

    await connect();

    const latestData = await CariAmanModel.findOne({ userId: targetUserId })
      .select(
        "riskScore riskLevel isScamIndicated isOjkLegal interestWarning manipulativeLanguageDetected sensitiveDataRequested socengIndicated apkDownloadIndicated channelViolationDetected aiSummary aiDetail aiRecommendation createdAt"
      )
      .sort({ createdAt: -1 });

    if (!latestData) {
      return res.status(200).json({
        message: "Belum ada data analisis",
        data: null,
      });
    }

    return res.status(200).json({
      message: "Berhasil mengambil data analisis terbaru",
      data: latestData,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Gagal mengambil data",
      error: String(error),
    });
  }
};