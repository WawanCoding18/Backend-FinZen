import { Response } from "express";
import { IReqUser } from "../middlewares/auth.Middleware";
import { hitungDataTransaksi } from "./transaksi.controller";
import { hitungDataPinjaman } from "./pinjaman.controller";
import { hitungDanSimpanFinancialHealth } from "./financialHealth.controller";
import { cekBudgetWarning } from "./budgeting.controller";
import UserModel  from "../models/user.model";

export const getDashboard = async (req: IReqUser, res: Response) => {
  try {
    const userId = req.user?.id;
    const username = await UserModel.findById(userId).select("username").lean().exec().then(user => user?.username);
    if (!userId) {
      return res
        .status(401)
        .json({ message: "Unauthorized: User tidak teridentifikasi" });
    }

    const [transaksiData, financialHealthData, pinjamanData, budgetWarnings] =
      await Promise.all([
        hitungDataTransaksi(userId.toString()),
        hitungDanSimpanFinancialHealth(userId.toString()),
        hitungDataPinjaman(userId.toString()),
        cekBudgetWarning(userId.toString()),
      ]);

    return res.status(200).json({
      message: "Dashboard data berhasil diambil",
      data: {
        notifikasi: budgetWarnings,
        nama: username,
        summary: {
          saldo: transaksiData.summary.saldo,
          totalPemasukan: transaksiData.summary.totalPemasukan,
          totalPengeluaran: transaksiData.summary.totalPengeluaran,
          totalPinjaman: pinjamanData.totalPinjaman,
          financialHealth: {
            skorTotal: financialHealthData.skorTotal,
            grade: financialHealthData.grade,
            updatedAt: financialHealthData.get("updatedAt"),
          },
          pinjaman: {
            sisaSlot: pinjamanData.sisaSlot,
            data: pinjamanData.data,
          },
          riwayatTransaksi: transaksiData.data,
        },
      },
    });
  } catch (error: any) {
    console.error("❌ Gagal mengambil data dashboard:", error.message);
    return res.status(500).json({
      message: "Gagal mengambil data dashboard",
      error: error.message,
    });
  }
};
