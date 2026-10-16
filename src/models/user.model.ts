import mongoose from "mongoose";
import { encrypt } from "../utils/Encryption";

export interface User {
  fullName: string;
  username: string;
  email: string;
  password: string;
  role: string;
  profilePicture: string;
  isActive: boolean;
  otpCode: string | null;
  otpExpiresAt: Date | null;
  createdAt?: string;
}

const UserSchema = new mongoose.Schema<User>(
  {
    fullName: {
      type: String,
      required: true,
    },
    username: {
      type: String,
      required: true,
      unique: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      default: "user",
    },
    profilePicture: {
      type: String,
      default: "user.jpg",
    },
    isActive: {
      type: Boolean,
      default: false,
    },
    otpCode: {
      type: String,
      default: null,
    },
    otpExpiresAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

UserSchema.pre("save", function (next) {
  const user = this;

  if (user.isModified("password")) {
    user.password = encrypt(user.password);
  }

  next();
});

// Sembunyikan field sensitif dari response
UserSchema.methods.toJSON = function () {
  const user = this;
  const userObject = user.toObject();

  delete userObject.password;
  delete userObject.otpCode;      
  delete userObject.otpExpiresAt;
  return userObject;
};

const UserModel = mongoose.model<User>("User", UserSchema);

export default UserModel;