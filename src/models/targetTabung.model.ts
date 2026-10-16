import mongoose, { Schema, Document } from "mongoose";

export interface ITargetTabung extends Document {
  user: mongoose.Types.ObjectId;
  icon: string;
  namaTarget: string;
  targetNominal: number;
  terkumpulNominal: number;
  deadlineTarget: Date;
  status: "Aktif" | "Tercapai" | "Gagal";
}

const TargetTabungSchema = new Schema<ITargetTabung>(
  {
    user: { 
      type: Schema.Types.ObjectId, 
      ref: "User", 
      required: true 
    },
    icon: { 
      type: String, 
      required: true, 
      default: "🎯" 
    },
    namaTarget: { 
      type: String, 
      required: true, 
      trim: true 
    },
    targetNominal: { 
      type: Number, 
      required: true, 
      min: 1 
    },
    terkumpulNominal: { 
      type: Number, 
      default: 0, 
      min: 0 
    },
    deadlineTarget: { 
      type: Date, 
      required: true 
    },
    status: {
      type: String,
      enum: ["Aktif", "Tercapai", "Gagal"],
      default: "Aktif",
    },
  },
  { timestamps: true }
);

const TargetTabungModel = mongoose.model<ITargetTabung>("targettabung", TargetTabungSchema);
export default TargetTabungModel;