import { Injectable } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';
import { config } from 'dotenv';
import * as fs from 'fs';
import * as streamifier from 'streamifier';

config(); // load .env

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

@Injectable()
export class CloudinaryService {

  // ---------------------- UPLOAD FROM FILE PATH ----------------------
  async uploadFile(filePath: string, folder = 'uploads'): Promise<string> {
    if (!fs.existsSync(filePath)) {
      throw new Error(`File does not exist at path: ${filePath}`);
    }

    try {
      const result = await cloudinary.uploader.upload(filePath, { folder });
      return result.secure_url;
    } catch (err) {
      console.error('Cloudinary upload error:', err);
      throw err;
    }
  }

  // ---------------------- UPLOAD IMAGE BUFFER ----------------------
  async uploadBufferFile(file: Express.Multer.File, folder = 'uploads'): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!file || !file.buffer) {
        return reject(new Error('No file buffer provided'));
      }

      const uploadStream = cloudinary.uploader.upload_stream(
        { folder, resource_type: "image" },   // Chỉ dùng cho IMAGE
        (error, result) => {
          if (error) {
            console.error('Cloudinary upload error:', error);
            return reject(error);
          }
          resolve(result?.secure_url || '');
        }
      );

      streamifier.createReadStream(file.buffer).pipe(uploadStream);
    });
  }

  // ---------------------- UPLOAD DOCUMENT (PDF, ZIP, DOCX...) ----------------------
  async uploadDocument(file: Express.Multer.File, folder = 'documents'): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!file || !file.buffer) {
        return reject(new Error('No file buffer provided'));
      }

      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: "raw",             // Quan trọng để upload PDF
          public_id: `${Date.now()}_${file.originalname}`,
        },
        (error, result) => {
          if (error) {
            console.error("Cloudinary upload RAW error:", error);
            return reject(error);
          }
          resolve(result?.secure_url || '');
        }
      );

      streamifier.createReadStream(file.buffer).pipe(uploadStream);
    });
  }

  // ---------------------- AUTO DETECT TYPE (IMAGE / PDF) ----------------------
  async uploadAuto(file: Express.Multer.File): Promise<string> {
    const isPDF = file.mimetype.includes("pdf");
    const isImage = file.mimetype.startsWith("image/");

    if (isPDF) {
      return this.uploadDocument(file, "documents");
    }

    if (isImage) {
      return this.uploadBufferFile(file, "uploads");
    }

    // fallback: treat as raw file
    return this.uploadDocument(file, "documents");
  }
}
