import mongoose from "mongoose";

export interface OjkLegalList {
  platform_name: string;
  company_name: string;
  license_number: string;
  registered_since: string;
  website_url: string;
}

const OjkLegalListSchema = new mongoose.Schema<OjkLegalList>(
  {
    platform_name: { type: String, required: true, unique: true, trim: true },
    company_name: { type: String, required: true, trim: true, index: true },
    license_number: { type: String, required: true, unique: true, trim: true },
    registered_since: { type: String, required: true },
    website_url: { type: String, required: true, unique: true, trim: true },
  },
  { timestamps: true }
);

export const OjkLegalListModel = mongoose.model<OjkLegalList>(
  "OjkLegalList",
  OjkLegalListSchema
);