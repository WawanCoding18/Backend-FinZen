import "dotenv/config";
import connectDB from "../utils/database";
import { OjkLegalListModel } from "../models/ojk.model";
import OJKData from "../knowledge/ojk-legal-list.json";
import readline from "readline";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

async function askQuestion(): Promise<string> {
  return new Promise((resolve) => {
    rl.question(
      "Masukkan nama platform untuk pengujian (misal: 'Rupiah Cepat'): ",
      (answer) => resolve(answer.trim())
    );
  });
}

async function seed() {
  console.log("⏳ Menghubungkan ke MongoDB...");
  await connectDB();

  console.log("🚀 Memulai proses seeding data OJK...");

  await OjkLegalListModel.deleteMany({});
  console.log("🗑️  Data lama berhasil dibersihkan.");

  if (Array.isArray(OJKData) && OJKData.length > 0) {
    await OjkLegalListModel.insertMany(OJKData);
    console.log(`✅ Berhasil menambahkan ${OJKData.length} data OJK ke MongoDB Atlas!`);
  } else {
    console.log("⚠️ Data JSON kosong atau format tidak sesuai array.");
  }

  const totalActive = await OjkLegalListModel.countDocuments({
    is_active: true,
  });

  console.log(`\n📊 Total data aktif di database: ${totalActive} entitas.`);

  const userMessage = await askQuestion();

  const samplePlatform = await OjkLegalListModel.findOne({
    platform_name: { $regex: userMessage, $options: "i" },
  });

  console.log("\n🔍 HASIL PENGUJIAN:");
  if (samplePlatform) {
    console.log("   └─ Status    : DITEMUKAN");
    console.log("   └─ Platform  : ", samplePlatform.platform_name);
    console.log("   └─ Izin OJK  : ", samplePlatform.license_number);
    console.log("   └─ Company   : ", samplePlatform.company_name);
    console.log("   └─ Website   : ", samplePlatform.website_url);
  } else {
    console.log("   └─ Status    : TIDAK DITEMUKAN / TIDAK TERDAFTAR");
  }

  rl.close();
  console.log("\n🎉 Seluruh proses seeding & pengujian selesai!");
  process.exit(0);
}

seed().catch((err) => {
  console.error("❌ Terjadi kesalahan saat proses:", err);
  rl.close();
  process.exit(1);
});

export { seed };