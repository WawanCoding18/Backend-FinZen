import dotenv from 'dotenv';


dotenv.config();

export const DATABASE_URL: string = process.env.DATABASE_URL || '';
export const SECRET: string = process.env.SECRET || '';
export const EMAIL_FROM: string = process.env.EMAIL_FROM || '';
export const EMAIL_APP_PASSWORD: string = process.env.EMAIL_APP_PASSWORD || '';
export const CLIENT_HOST: string = process.env.CLIENT_HOST || 'http://localhost:4001';
