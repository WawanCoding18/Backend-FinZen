import { z } from "zod";

export const RiskAnalysisSchema = z.object({
  risk_score: z.number().min(0).max(100),
  risk_level: z.enum(["aman", "waspada", "berbahaya"]),
  is_scam_indicated: z.boolean(),
    is_ojk_legal: z.string().transform((val) => {
    const lower = val.toLowerCase().trim();
    if (lower.includes("terdaftar") || lower.includes("resmi") || lower.includes("legal")) {
      return "Terdaftar Resmi";
    }
    return "Tidak Ditemukan";
  }),
  interest_warning: z.boolean(),
  manipulative_language_detected: z.boolean(),
  sensitive_data_requested: z.boolean(),
  soceng_indicated: z.boolean(),
  apk_download_indicated: z.boolean(),
  channel_violation_detected: z.boolean(),
  ai_summary: z.string(),
  ai_detail: z.string(),
  ai_recommendation: z.string(),
});

export type RiskAnalysis = z.infer<typeof RiskAnalysisSchema>;