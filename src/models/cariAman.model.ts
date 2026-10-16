import mongoose, { Schema, Document } from "mongoose";

export interface cariAman extends Document {
  userId: mongoose.Types.ObjectId;
  riskScore: number;
  riskLevel: "aman" | "waspada" | "berbahaya";
  isScamIndicated: boolean;
  isOjkLegal: "Terdaftar Resmi" | "Tidak Ditemukan";

  interestWarning: boolean;
  manipulativeLanguageDetected: boolean;
  sensitiveDataRequested: boolean;
  socengIndicated: boolean;
  apkDownloadIndicated: boolean;
  channelViolationDetected: boolean;

  aiSummary: string;
  aiDetail: string;
  aiRecommendation: string;
  createdAt: Date;
  updatedAt: Date;
}

const cariAmanSchema = new Schema<cariAman>(
  {
    userId: { 
      type: Schema.Types.ObjectId, 
      ref: "User", 
      required: true, 
      index: true 
    },
    riskScore: { type: Number, required: true },
    riskLevel: { 
      type: String, 
      enum: ["aman", "waspada", "berbahaya"], 
      required: true 
    },
    isScamIndicated: { type: Boolean, default: false },
    isOjkLegal: { 
      type: String, 
      enum: ["Terdaftar Resmi", "Tidak Ditemukan"], 
      default: "Tidak Ditemukan" 
    },

    interestWarning: { type: Boolean, default: false },
    manipulativeLanguageDetected: { type: Boolean, default: false },
    sensitiveDataRequested: { type: Boolean, default: false },
    socengIndicated: { type: Boolean, default: false },
    apkDownloadIndicated: { type: Boolean, default: false },
    channelViolationDetected: { type: Boolean, default: false },

    aiSummary: { type: String, required: true },
    aiDetail: { type: String, required: true },
    aiRecommendation: { type: String, required: true },
  },
  {
    timestamps: true,
    collection: "cari_amans" 
  }
);

const cariAman =
  mongoose.models.cariAman ||
  mongoose.model<cariAman>("cariAman", cariAmanSchema);

export default cariAman;