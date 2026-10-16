import mongoose from "mongoose";

export interface Profile {
  user: mongoose.Types.ObjectId;
  fotoProfilUrl: string | null;
  saldoSekarang: number;
  sumberPemasukan: string;
  onboardingCompleted: boolean;
}

const ProfileSchema = new mongoose.Schema<Profile>(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    fotoProfilUrl: {
      type: String,
      default: null,
    },
    saldoSekarang: {
      type: Number,
      required: true,
      min: 0,
    },
    sumberPemasukan: {
      type: String,
      enum: [
        "Gaji",
        "Uang Saku",
        "Part-time",
        "Freelance",
        "Beasiswa",
        "Bisnis Kecil",
        "Investasi",
        "Lainnya",
      ],
      required: true,
    },
    onboardingCompleted: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
);

const ProfileModel = mongoose.model<Profile>("Profile", ProfileSchema);
export default ProfileModel;
