import { User } from "../models/user.model";
import { Types } from "mongoose";
import jwt from "jsonwebtoken";
import { SECRET } from "./env";

export interface IUserToken
  extends Omit<
    User,
    | "activation"
    | "isActive"
    | "profilePicture"
    | "password"
    | "email"
    | "username"
    | "fullName"
  > {
  id?: Types.ObjectId;
}

export const generateToken = (user: IUserToken): string => {
  const token = jwt.sign(user, SECRET, {
    expiresIn: "1d", //expired saat sudah 1 hari 
  });

  return token;
};

export const generateUser = (token: string): IUserToken | null => {
  try {
    //jwt.verify akan membaca token dan memverifikasi signature-nya
    const user = jwt.verify(token, SECRET) as IUserToken;
    return user;
  } catch (error) {
    return null;
  }
};