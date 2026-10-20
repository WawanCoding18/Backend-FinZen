import express from "express";
import authController from "../controllers/auth.controller";
import authMiddleware from "../middlewares/auth.Middleware";
import { createTransaksi, getAllTransaksi, getTransaksiById, updateTransaksi, deleteTransaksi} from "../controllers/transaksi.controller";
import { upload } from "../middlewares/upload.Middleware"
import { handleOcrUpload } from "../controllers/chat.controller";
import { getProfile, postProfile, updateProfile } from "../controllers/profile.controller";
import { postPinjaman, getAllPinjaman, putPinjaman, editPinjaman, deletePinjaman, perpanjangTempo, lunasiPinjaman } from "../controllers/pinjaman.controller";
import { postKalkulatorBunga, getKalkulatorBunga } from "../controllers/kalkulator.controller"
import { postBudgeting, getAllBudgeting, updateBudgeting, deleteBudgeting } from "../controllers/budgeting.controller";
import { getCariAman, postCariAman } from "../controllers/cariAman.controller";
import { getFinancialHealth, postFinancialHealth } from "../controllers/financialHealth.controller"
import { getDashboard } from "../controllers/dashboard.controller";
import { deleteTargetTabung, editTargetTabung, getAllTargetTabung, postTargetTabung, setorTargetTabung } from "../controllers/targetTabung.controller";

const router = express.Router();

//router auth/register, login, and me
router.post("/auth/register", authController.register);
router.post("/auth/login", authController.login);
router.get("/auth/me", authMiddleware ,authController.me);
router.post("/auth/logout", authMiddleware, authController.logout);
router.post("/auth/verify-otp", authController.verifyOTP);
router.post("/auth/resend-otp", authController.resendOTP);

//router profile
router.post("/profile/onboarding", authMiddleware, postProfile);
router.get("/profile", authMiddleware, getProfile);
router.put("/profile", authMiddleware, updateProfile);

//scan OCR
router.post('/catatan-keuangan/scan', upload.single('image'), authMiddleware, handleOcrUpload);

//router pinjaman
router.post("/catatan-keuangan/pinjaman/tambah-pinjaman", authMiddleware, postPinjaman);
router.get("/catatan-keuangan/pinjaman", authMiddleware, getAllPinjaman);
router.put("/catatan-keuangan/pinjaman/:id/bayar", authMiddleware, putPinjaman);
router.put("/catatan-keuangan/pinjaman/:id", authMiddleware, editPinjaman);
router.put("/catatan-keuangan/pinjaman/:id/lunasi", authMiddleware, lunasiPinjaman);
router.put("/catatan-keuangan/pinjaman/:id/perpanjang", authMiddleware, perpanjangTempo);
router.delete("/catatan-keuangan/pinjaman/:id", authMiddleware, deletePinjaman);

//router target tabung
router.post("/catatan-keuangan/target-tabung/tambah-target", authMiddleware, postTargetTabung);
router.get("/catatan-keuangan/target-tabung", authMiddleware, getAllTargetTabung);
router.put("/catatan-keuangan/target-tabung/:id/setor", authMiddleware, setorTargetTabung);
router.put("/catatan-keuangan/target-tabung/:id", authMiddleware, editTargetTabung);
router.delete("/catatan-keuangan/target-tabung/:id", authMiddleware, deleteTargetTabung);

//router budgeting
router.post("/catatan-keuangan/budgeting/tambah-budget", authMiddleware, postBudgeting);
router.get("/catatan-keuangan/budgeting", authMiddleware, getAllBudgeting);
router.put("/catatan-keuangan/budgeting/:id", authMiddleware, updateBudgeting);
router.delete("/catatan-keuangan/budgeting/:id", authMiddleware, deleteBudgeting);

//router transaksi
router.post("/catatan-keuangan/transaksi", authMiddleware, createTransaksi);
router.get("/catatan-keuangan", authMiddleware, getAllTransaksi);
router.get("/catatan-keuangan/:id", authMiddleware, getTransaksiById);
router.put("/catatan-keuangan/:id", authMiddleware, updateTransaksi);
router.delete("/catatan-keuangan/:id", authMiddleware, deleteTransaksi);

//router kalkulator bunga
router.post('/kalkulator-bunga', authMiddleware, postKalkulatorBunga);
router.get("/kalkulator-bunga/output", authMiddleware, getKalkulatorBunga); 

//router cariAman
router.post("/cariAman", authMiddleware, postCariAman);
router.get("/cariAman/output", authMiddleware, getCariAman);

//router financialhealth
router.post("/financial-health/output", authMiddleware, postFinancialHealth);
router.get("/dashboard/financial-health", authMiddleware, getFinancialHealth);

//router dashboard
router.get("/dashboard", authMiddleware, getDashboard);

export default router;