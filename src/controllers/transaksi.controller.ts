import { Response } from "express";
import TransaksiModel from "../models/transaksi.model";
import { IReqUser } from "../middlewares/auth.Middleware";
import ProfileModel from "../models/profile.model";
import TargetTabungModel from "../models/targetTabung.model";

export const createTransaksi = async (req: IReqUser, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res
        .status(401)
        .json({ message: "Unauthorized: User tidak teridentifikasi" });
    }

    const {
      Catatan_Transaksi,
      tipe,
      kategori,
      Sumber_Dana,
      nominal,
      tanggal,
      targetTabungId,
    } = req.body;

    const transaksi = await TransaksiModel.create({
      user: userId,
      Catatan_Transaksi,
      tipe,
      kategori,
      Sumber_Dana,
      nominal: Math.abs(Number(nominal)),
      tanggal: tanggal ? new Date(tanggal) : new Date(),
      targetTabungId: targetTabungId || null,
    });

    return res
      .status(201)
      .json({ message: "Transaksi berhasil dibuat", data: transaksi });
  } catch (error) {
    return res
      .status(400)
      .json({ message: "Gagal membuat transaksi", error: String(error) });
  }
};

export const hitungDataTransaksi = async (userId: string, type?: string) => {
  const allTransaksi = await TransaksiModel.find({ user: userId });
  const totalPemasukan = allTransaksi
    .filter((t) => t.tipe === "pemasukan")
    .reduce((acc, curr) => acc + Math.abs(curr.nominal ?? 0), 0);

  const totalPengeluaran = allTransaksi
    .filter((t) => t.tipe === "pengeluaran")
    .reduce((acc, curr) => acc + Math.abs(curr.nominal ?? 0), 0);

  const saldoAwal = await ProfileModel.findOne({ user: userId }).select(
    "saldoSekarang",
  );
  const saldo =
    (saldoAwal?.saldoSekarang ?? 0) + totalPemasukan - totalPengeluaran;

  const filter: any = { user: userId };
  if (type) {
    filter.tipe = type;
  }

  const transaksiList = await TransaksiModel.find(filter).sort({
    tanggal: -1,
  });

  return {
    summary: {
      saldo,
      totalPemasukan,
      totalPengeluaran,
    },
    data: transaksiList,
  };
};

export const getAllTransaksi = async (req: IReqUser, res: Response) => {
  try {
    const userId = req.user?.id?.toString();
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const result = await hitungDataTransaksi(userId, req.query.type as string);

    return res.status(200).json(result);
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Gagal mengambil data", error: String(error) });
  }
};

export const getTransaksiById = async (req: IReqUser, res: Response) => {
  try {
    const userId = req.user?.id;

    const transaksi = await TransaksiModel.findOne({
      _id: req.params.id,
      user: userId,
    });

    if (!transaksi) {
      return res.status(404).json({ message: "Transaksi tidak ditemukan" });
    }

    return res.status(200).json({ data: transaksi });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Gagal mengambil data", error: String(error) });
  }
};

export const updateTransaksi = async (req: IReqUser, res: Response) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    const oldTransaksi = await TransaksiModel.findOne({
      _id: id,
      user: userId,
    });
    if (!oldTransaksi) {
      return res.status(404).json({
        message: "Transaksi tidak ditemukan atau Anda tidak memiliki akses",
      });
    }

    const newNominal =
      req.body.nominal !== undefined
        ? Math.abs(Number(req.body.nominal))
        : oldTransaksi.nominal;

    if (oldTransaksi.targetTabungId && oldTransaksi.nominal !== newNominal) {
      const selisih = newNominal - oldTransaksi.nominal;
      const target = await TargetTabungModel.findById(
        oldTransaksi.targetTabungId,
      );
      if (target) {
        target.terkumpulNominal = Math.max(
          0,
          target.terkumpulNominal + selisih,
        );
        if (target.terkumpulNominal < target.targetNominal) {
          target.status = "Aktif";
        } else {
          target.status = "Tercapai";
        }
        await target.save();
      }
    }

    const updatedData = {
      ...req.body,
      ...(req.body.nominal !== undefined ? { nominal: Math.abs(Number(req.body.nominal)) } : {})
    };

    const updatedTransaksi = await TransaksiModel.findOneAndUpdate(
      { _id: id, user: userId },
      updatedData,
      { new: true, runValidators: true },
    );

    return res
      .status(200)
      .json({ message: "Transaksi berhasil diupdate", data: updatedTransaksi });
  } catch (error) {
    return res
      .status(400)
      .json({ message: "Gagal update transaksi", error: String(error) });
  }
};

export const deleteTransaksi = async (req: IReqUser, res: Response) => {
  const session = await TransaksiModel.startSession();
  session.startTransaction();

  try {
    const { id } = req.params;
    const userId = req.user?.id;

    const transaksi = await TransaksiModel.findOne({
      _id: id,
      user: userId,
    }).session(session);
    if (!transaksi) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: "Transaksi tidak ditemukan" });
    }

    if (transaksi.targetTabungId) {
      const target = await TargetTabungModel.findById(
        transaksi.targetTabungId,
      ).session(session);
      if (target) {
        target.terkumpulNominal = Math.max(
          0,
          target.terkumpulNominal - transaksi.nominal,
        );

        if (target.terkumpulNominal < target.targetNominal) {
          target.status = "Aktif";
        }
        await target.save({ session });
      }
    }

    await TransaksiModel.findByIdAndDelete(id).session(session);

    await session.commitTransaction();
    session.endSession();

    const profile = await ProfileModel.findOne({ user: userId });

    return res.status(200).json({
      message: "Transaksi berhasil dihapus",
      saldoBaru: profile?.saldoSekarang,
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    return res
      .status(500)
      .json({ message: "Gagal menghapus transaksi", error: String(error) });
  }
};



