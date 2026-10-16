import { Request, Response } from "express";
import BudgetingModel from "../models/budgeting.model";
import { IReqUser } from "../middlewares/auth.Middleware";
import TransaksiModel from "../models/transaksi.model";

//Tambah Budget Baru
export const postBudgeting = async (req: IReqUser, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res
        .status(401)
        .json({ message: "Unauthorized: User tidak teridentifikasi" });
    }

    const { Kategori_Budget, Batas_PerBulan, Tanggal_Mulai, Tanggal_Selesai } =
      req.body;

    const batas = Number(Batas_PerBulan);
    const mulai = new Date(Tanggal_Mulai);
    const selesai = new Date(Tanggal_Selesai);

    if (!Kategori_Budget) {
      return res.status(400).json({ message: "Kategori Budget wajib dipilih" });
    }
    if (!batas || batas <= 0) {
      return res
        .status(400)
        .json({ message: "Batas per Bulan harus lebih dari 0" });
    }
    if (isNaN(mulai.getTime()) || isNaN(selesai.getTime())) {
      return res
        .status(400)
        .json({ message: "Tanggal Mulai / Tanggal Selesai tidak valid" });
    }
    if (selesai <= mulai) {
      return res
        .status(400)
        .json({ message: "Tanggal Selesai harus setelah Tanggal Mulai" });
    }

    //Cegah kategori bentrok
    const budgetBentrok = await BudgetingModel.findOne({
      user: userId,
      Kategori_Budget,
      Tanggal_Mulai: { $lte: selesai },
      Tanggal_Selesai: { $gte: mulai },
    });

    if (budgetBentrok) {
      return res.status(400).json({
        message: `Budget untuk kategori "${Kategori_Budget}" pada periode ini sudah ada`,
      });
    }

    //Query ke Database
    const newBudgeting = await BudgetingModel.create({
      user: userId,
      Kategori_Budget,
      Batas_PerBulan: batas,
      Tanggal_Mulai: mulai,
      Tanggal_Selesai: selesai,
    });

    //Kirim Response Sukses
    return res.status(201).json({
      message: "Berhasil menambahkan budget",
      data: newBudgeting,
    });
  } catch (error) {
    return res
      .status(400)
      .json({ message: "Gagal membuat budget", error: String(error) });
  }
};

export const getAllBudgeting = async (req: IReqUser, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const listBudgeting = await BudgetingModel.find({ user: userId }).sort({
      createdAt: -1,
    });

    //Hitung terpakai untuk tiap budget, berdasarkan transaksi di kategori & rentang tanggal yang sama
    const formattedData = await Promise.all(
      listBudgeting.map(async (budget: any) => {
        const transaksiDalamPeriode = await TransaksiModel.find({
          user: userId,
          kategori: budget.Kategori_Budget,
          tipe: "pengeluaran",
          tanggal: {
            $gte: budget.Tanggal_Mulai,
            $lte: budget.Tanggal_Selesai,
          },
        });

        const terpakai = transaksiDalamPeriode.reduce(
          (acc, t) => acc + (t.nominal ?? 0),
          0,
        );

        const tersisa = Math.max(0, budget.Batas_PerBulan - terpakai);
        const persentase =
          budget.Batas_PerBulan > 0
            ? Number(((terpakai / budget.Batas_PerBulan) * 100).toFixed(0))
            : 0;

        //Hitung sisa hari sampai Tanggal Selesai
        const today = new Date();
        const selesai = new Date(budget.Tanggal_Selesai);
        const selisihMs = selesai.getTime() - today.getTime();
        const sisaHari = Math.max(
          0,
          Math.ceil(selisihMs / (1000 * 60 * 60 * 24)),
        );

        //status berdasarkan persentase
        let statusLabel = "Batas Aman";
        if (persentase >= 100) {
          statusLabel = "Melebihi Budget";
        } else if (persentase >= 70) {
          statusLabel = "Mendekati Batas";
        }

        return {
          _id: budget._id,
          Kategori_Budget: budget.Kategori_Budget,
          Batas_PerBulan: budget.Batas_PerBulan,
          Tanggal_Mulai: budget.Tanggal_Mulai,
          Tanggal_Selesai: budget.Tanggal_Selesai,
          terpakai,
          tersisa,
          persentase,
          sisaHari,
          statusLabel,
        };
      }),
    );

    //Total dari semua Batas PerBulan
    const totalBudget = formattedData.reduce((acc, item) => {
      return acc + (item.Batas_PerBulan ?? 0);
    }, 0);

    //Total dari semua terpakai
    const totalPengeluaran = formattedData.reduce((acc, item) => {
      return acc + (item.terpakai ?? 0);
    }, 0);

    //Sisa Budget -> Total Budget - Total Pengeluaran
    const sisaBudget = Math.max(0, totalBudget - totalPengeluaran);

    return res.status(200).json({
      message: "Berhasil mengambil data budgeting",
      summary: {
        totalBudget,
        totalPengeluaran,
        sisaBudget,
      },
      data: formattedData,
    });
  } catch (error) {
    return res
      .status(500)
      .json({
        message: "Gagal mengambil data budgeting",
        error: String(error),
      });
  }
};

//Edit Budget berdasarkan ID
export const updateBudgeting = async (req: IReqUser, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res
        .status(401)
        .json({ message: "Unauthorized: User tidak teridentifikasi" });
    }

    //Cari data budget milik user ini
    const budget = await BudgetingModel.findOne({ _id: id, user: userId });
    if (!budget) {
      return res.status(404).json({ message: "Budget tidak ditemukan" });
    }

    const budgetAny: any = budget;

    //Ambil field yang boleh diubah
    const { Kategori_Budget, Batas_PerBulan, Tanggal_Mulai, Tanggal_Selesai } =
      req.body || {};

    const kategoriBaru = Kategori_Budget ?? budgetAny.Kategori_Budget;
    const batasBaru =
      Batas_PerBulan !== undefined
        ? Number(Batas_PerBulan)
        : budgetAny.Batas_PerBulan;
    const mulaiBaru = Tanggal_Mulai
      ? new Date(Tanggal_Mulai)
      : budgetAny.Tanggal_Mulai;
    const selesaiBaru = Tanggal_Selesai
      ? new Date(Tanggal_Selesai)
      : budgetAny.Tanggal_Selesai;

    if (!batasBaru || batasBaru <= 0) {
      return res
        .status(400)
        .json({ message: "Batas per Bulan harus lebih dari 0" });
    }
    if (isNaN(mulaiBaru.getTime()) || isNaN(selesaiBaru.getTime())) {
      return res
        .status(400)
        .json({ message: "Tanggal Mulai / Tanggal Selesai tidak valid" });
    }
    if (selesaiBaru <= mulaiBaru) {
      return res
        .status(400)
        .json({ message: "Tanggal Selesai harus setelah Tanggal Mulai" });
    }

    //Cegah bentrok dengan budget lainnya kecuali dirinya sendiri
    const budgetBentrok = await BudgetingModel.findOne({
      _id: { $ne: id },
      user: userId,
      Kategori_Budget: kategoriBaru,
      Tanggal_Mulai: { $lte: selesaiBaru },
      Tanggal_Selesai: { $gte: mulaiBaru },
    });

    if (budgetBentrok) {
      return res.status(400).json({
        message: `Budget untuk kategori "${kategoriBaru}" pada periode ini sudah ada`,
      });
    }

    budgetAny.Kategori_Budget = kategoriBaru;
    budgetAny.Batas_PerBulan = batasBaru;
    budgetAny.Tanggal_Mulai = mulaiBaru;
    budgetAny.Tanggal_Selesai = selesaiBaru;

    await budgetAny.save();

    return res.status(200).json({
      message: "Berhasil memperbarui budget",
      data: budgetAny,
    });
  } catch (error) {
    return res
      .status(400)
      .json({ message: "Gagal update budget", error: String(error) });
  }
};

//Hapus Budget berdasarkan ID
export const deleteBudgeting = async (req: IReqUser, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res
        .status(401)
        .json({ message: "Unauthorized: User tidak teridentifikasi" });
    }

    const deletedBudget = await BudgetingModel.findOneAndDelete({
      _id: id,
      user: userId,
    });

    if (!deletedBudget) {
      return res
        .status(404)
        .json({ message: "Budget tidak ditemukan atau bukan milik Anda" });
    }

    return res.status(200).json({
      message: "Berhasil menghapus budget",
    });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Gagal menghapus budget", error: String(error) });
  }
};

export const cekBudgetWarning = async (userId: string) => {
  const listBudgeting = await BudgetingModel.find({ user: userId });
  const warnings = [];

  for (const budget of listBudgeting) {
    const transaksiDalamPeriode = await TransaksiModel.find({
      user: userId,
      kategori: budget.Kategori_Budget,
      tipe: "pengeluaran",
      tanggal: { $gte: budget.Tanggal_Mulai, $lte: budget.Tanggal_Selesai },
    });

    const terpakai = transaksiDalamPeriode.reduce(
      (acc, t) => acc + (t.nominal ?? 0),
      0,
    );
    const persentase =
      budget.Batas_PerBulan > 0
        ? Math.round((terpakai / budget.Batas_PerBulan) * 100)
        : 0;

    if (persentase >= 80) {
      warnings.push({
        kategori: budget.Kategori_Budget,
        persentase,
        pesan: `${persentase}% budget terpakai! Saatnya kamu menghemat agar target tabungan tetap tercapai dan cicilan bisa dibayar tepat waktu.`,
      });
    }
  }

  return warnings;
};


