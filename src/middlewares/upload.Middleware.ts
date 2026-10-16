import multer from "multer";
import { Request } from "express";

//Simpan di RAM
const storage = multer.memoryStorage();

//Hanya mengizinkan format gambar yang sudah ditentukan
const fileFilter = (
  _req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  const allowedMimeTypes = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        "Format file tidak didukung! Hanya file gambar (JPG, PNG, WEBP) yang diperbolehkan."
      )
    );
  }
};

export const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, //Maksimal 5 MB
  },
  fileFilter,
});

