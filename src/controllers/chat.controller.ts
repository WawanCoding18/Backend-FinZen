import { Response } from "express";
import { IReqUser } from "../middlewares/auth.Middleware";
import { askAIStream } from "../services/ai.services";
import { scanTextPaddle } from "../services/ocr.services";
import connect from "../utils/database";
import TransaksiModel from "../models/transaksi.model"; 

export const handleOcrUpload = async (req: IReqUser, res: Response) => {
  const userId = req.user?.id;
  const imageBuffer = req.file?.buffer;

  if (!userId) {
    return res.status(401).json({ error: "Unauthorized: User tidak teridentifikasi" });
  }

  if (!imageBuffer) {
    return res.status(400).json({ error: "Gambar tidak boleh kosong" });
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  try {
    await connect();

    const ocrResult = await scanTextPaddle(imageBuffer);

    const ocrText: string = (() => {
      if (!ocrResult) return "";

      if (typeof ocrResult === "object" && Array.isArray((ocrResult as any).result)) {
        return (ocrResult as any).result
          .map((item: any) => (typeof item === "string" ? item : item.text || ""))
          .filter(Boolean)
          .join(" ");
      }

      if (typeof ocrResult === "string") return ocrResult;

      if (Array.isArray(ocrResult)) {
        return ocrResult
          .map((item: any) => (typeof item === "string" ? item : item.text || ""))
          .filter(Boolean)
          .join(" ");
      }

      if (typeof ocrResult === "object") {
        if (typeof (ocrResult as any).text === "string") return (ocrResult as any).text;
        if (Array.isArray((ocrResult as any).text)) return (ocrResult as any).text.join(" ");
        if (Array.isArray((ocrResult as any).lines)) return (ocrResult as any).lines.join(" ");
      }

      return String(ocrResult);
    })();

    console.log("📝 Extracted OCR Text:", ocrText);

    if (!ocrText || ocrText === "[object Object]") {
      throw new Error("Gagal mengekstrak teks dari respon OCR");
    }

    const result = await askAIStream(ocrText, res);

    const savedTransaksi = await TransaksiModel.create({
      user: userId,
      Catatan_Transaksi: (result as any).Catatan_Transaksi,
      tipe: (result as any).tipe,
      kategori: (result as any).kategori,
      Sumber_Dana: (result as any).Sumber_Dana,
      nominal: (result as any).nominal,
      tanggal: new Date((result as any).tanggal),
    });

    res.write(
      `data: ${JSON.stringify({ type: "done", result: savedTransaksi })}\n\n`
    );
  } catch (error: any) {
    console.error("Gagal proses gambar:", error.message);
    res.write(
      `data: ${JSON.stringify({
        type: "error",
        text: error.message || "Gagal menganalisis gambar",
      })}\n\n`
    );
  } finally {
    res.end(); 
  }
};
