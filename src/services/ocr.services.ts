import axios from "axios";
import FormData from "form-data";
import sharp from "sharp";

export interface OCRItem {
  box: number[][];
  text: string;
  confidence: number;
}

export interface PaddleOCRResponse {
  result: OCRItem[];
  processing_time_ms?: number;
}

const PADDLE_OCR_URL =
  process.env.MODAL_OCR_URL ||
  "https://wawancoding18--paddleocr-fastapi-service-fastapi-app.modal.run/ocr";

export const scanTextPaddle = async (
  imageBuffer: Buffer,
  originalName: string = "image.jpg"
): Promise<PaddleOCRResponse> => {
  const startTime = performance.now();

  try {

    const resizedBuffer = await sharp(imageBuffer)
      .resize({
        width: 1024,
        height: 1024,
        fit: "inside",
        withoutEnlargement: true,
      })
      .jpeg({ quality: 80 })
      .toBuffer();

    const formData = new FormData();
    formData.append("file", resizedBuffer, {
      filename: originalName.replace(/\.[^/.]+$/, "") + ".jpg",
      contentType: "image/jpeg",
    });

    const response = await axios.post<PaddleOCRResponse>(
      PADDLE_OCR_URL,
      formData,
      {
        headers: {
          ...formData.getHeaders(),
        },
        timeout: 120000,
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
      }
    );

    const durationMs = performance.now() - startTime;
    const durationSec = (durationMs / 1000).toFixed(2);
    console.log(`\n⏱️ [PADDLEOCR HTTP COMPLETED]`);
    console.log(`├─ Duration Express -> FastAPI : ${durationMs.toFixed(2)} ms (${durationSec} detik)`);
    console.log(`└─ Lines Detected : ${response.data.result?.length || 0}`);

    return {
      ...response.data,
      processing_time_ms: parseFloat(durationMs.toFixed(2)),
    };
  } catch (error: any) {
    console.error(
      "❌ Error communicating with PaddleOCR service:",
      error.message
    );
    throw new Error("Failed to process image with PaddleOCR microservice.");
  }
};