// Tes otomatis Kelola Pinjaman
// TOKEN="$TOKEN" node test-pinjaman.js
// BASE="http://localhost:4000/api"  KEEP=1 (jangan hapus data uji)

const BASE = process.env.BASE || "http://localhost:4000/api";
const TOKEN = process.env.TOKEN || process.argv[2];
const KEEP = process.env.KEEP === "1";

if (!TOKEN) {
  console.log('Pakai: TOKEN="$TOKEN" node test-pinjaman.js');
  process.exit(1);
}

const G = "\x1b[32m", R = "\x1b[31m", Y = "\x1b[33m", C = "\x1b[36m";
const B = "\x1b[1m", D = "\x1b[2m", X = "\x1b[0m";

let pass = 0;
let fail = 0;

const rp = (n) => "Rp" + Number(n).toLocaleString("id-ID");
const iso = (ms) => new Date(Date.now() + ms).toISOString();
const DAY = 24 * 60 * 60 * 1000;

async function call(method, path, body, auth = true) {
  const res = await fetch(BASE + path, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(auth ? { Authorization: "Bearer " + TOKEN } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text.slice(0, 200) };
  }
  return { status: res.status, json };
}

function section(title) {
  console.log(`\n${B}${C}== ${title} ==${X}`);
}

function check(name, ok, detail) {
  if (ok) {
    pass++;
    console.log(`${G}  ✔ PASS${X}  ${name}`);
  } else {
    fail++;
    console.log(`${R}  ✘ FAIL${X}  ${name}`);
  }
  if (detail) console.log(`${D}           ${detail}${X}`);
}

const info = (r) => `HTTP ${r.status} | ${r.json.message ?? r.json.raw ?? ""}`;

async function ambil(id) {
  const r = await call("GET", "/catatan-keuangan/pinjaman");
  return (r.json.data || []).find((p) => p._id === id);
}

async function buat(nama, total, tenor, cicilan, tempoMs) {
  const r = await call("POST", "/catatan-keuangan/pinjaman/tambah-pinjaman", {
    namaPlatform: nama,
    jenisPinjaman: "Paylater",
    totalPinjaman: total,
    tenorCicilan: tenor,
    cicilanBulanan: cicilan,
    jatuhTempo: iso(tempoMs),
    persenBunga: 2,
  });
  return r.json.data?._id;
}

(async () => {
  const tag = Date.now().toString().slice(-4);
  const nA = `Uji A ${tag}`;
  const nB = `Uji B ${tag}`;
  const nC = `Uji C ${tag}`;

  console.log(`${B}TES KELOLA PINJAMAN (REVISI)${X}  ${D}${BASE}${X}`);

  // 0. Koneksi
  const ping = await call("GET", "/dashboard");
  if (ping.status !== 200) {
    console.log(`${R}Token ditolak / server mati: ${info(ping)}${X}`);
    process.exit(1);
  }

  // 1. Data uji
  section("1. Membuat 3 pinjaman uji");
  const idA = await buat(nA, 1200000, 12, 100000, 30 * DAY);
  const idB = await buat(nB, 600000, 6, 100000, 12 * 60 * 60 * 1000);
  const idC = await buat(nC, 300000, 3, 100000, 12 * 60 * 60 * 1000);
  check("Pinjaman A dibuat (jatuh tempo 30 hari lagi)", !!idA);
  check("Pinjaman B dibuat (H-1)", !!idB);
  check("Pinjaman C dibuat (H-1)", !!idC);
  if (!idA || !idB || !idC) {
    console.log(`${R}Gagal membuat data uji, tes dihentikan.${X}`);
    process.exit(1);
  }

  // 2. Field baru
  section("2. Field baru di GET (mode & cicilanMinimum)");
  let a = await ambil(idA);
  let b = await ambil(idB);
  let c = await ambil(idC);
  check(
    "A: mode = cicilan",
    a?.mode === "cicilan",
    `mode=${a?.mode}, sisaHari=${a?.sisaHari}`
  );
  check(
    "A: cicilanMinimum = 1.200.000 / 12 = Rp100.000",
    a?.cicilanMinimum === 100000,
    `cicilanMinimum=${a?.cicilanMinimum}`
  );
  check(
    "B: mode = pelunasan (H-1)",
    b?.mode === "pelunasan",
    `mode=${b?.mode}, sisaHari=${b?.sisaHari}`
  );
  check(
    "C: mode = pelunasan (H-1)",
    c?.mode === "pelunasan",
    `mode=${c?.mode}, sisaHari=${c?.sisaHari}`
  );

  // 3. Bayar cicilan
  section("3. Bayar cicilan (A, minimum Rp100.000)");
  let r = await call("PUT", `/catatan-keuangan/pinjaman/${idA}/bayar`, {
    nominalBayar: 50000,
  });
  check("Bayar Rp50.000 (di bawah minimum) ditolak 400", r.status === 400, info(r));
  check(
    "Pesan menyebut 'Cicilan minimal Rp100.000'",
    String(r.json.message).includes("100.000")
  );

  r = await call("PUT", `/catatan-keuangan/pinjaman/${idA}/bayar`, {
    nominalBayar: 100000,
  });
  a = await ambil(idA);
  check(
    "Bayar pas minimum Rp100.000 berhasil, sisa Rp1.100.000",
    r.status === 200 && a?.totalYangHarusDibayar === 1100000,
    `${info(r)} | sisa=${rp(a?.totalYangHarusDibayar)}`
  );

  r = await call("PUT", `/catatan-keuangan/pinjaman/${idA}/bayar`, {
    nominalBayar: 250000,
  });
  a = await ambil(idA);
  check(
    "Bayar Rp250.000 (di atas minimum) berhasil, sisa Rp850.000",
    r.status === 200 && a?.totalYangHarusDibayar === 850000,
    `${info(r)} | sisa=${rp(a?.totalYangHarusDibayar)}`
  );

  r = await call("PUT", `/catatan-keuangan/pinjaman/${idA}/bayar`, {});
  a = await ambil(idA);
  check(
    "Tanpa nominal: otomatis bayar minimum, sisa Rp750.000",
    r.status === 200 && a?.totalYangHarusDibayar === 750000,
    `${info(r)} | sisa=${rp(a?.totalYangHarusDibayar)}`
  );

  // 4. H-1
  section("4. H-1 jatuh tempo (B): cicilan dikunci");
  r = await call("PUT", `/catatan-keuangan/pinjaman/${idB}/bayar`, {
    nominalBayar: 100000,
  });
  check("Bayar cicilan saat H-1 ditolak 400", r.status === 400, info(r));
  check(
    "Pesan menyebut 'H-1'",
    String(r.json.message).includes("H-1")
  );

  // 5. Perpanjang
  section("5. Perpanjang tempo (B)");
  r = await call("PUT", `/catatan-keuangan/pinjaman/${idB}/perpanjang`, {
    jatuhTempoBaru: iso(-5 * DAY),
  });
  check("Tanggal lebih awal ditolak 400", r.status === 400, info(r));

  r = await call("PUT", `/catatan-keuangan/pinjaman/${idB}/perpanjang`, {
    jatuhTempoBaru: iso(60 * DAY),
  });
  b = await ambil(idB);
  check(
    "Tanggal valid diterima 200",
    r.status === 200,
    `${info(r)}`
  );
  check(
    "Setelah perpanjang, B kembali mode = cicilan",
    b?.mode === "cicilan",
    `mode=${b?.mode}, sisaHari=${b?.sisaHari}`
  );

  // 6. Pelunasan
  section("6. Pelunasan (C)");
  r = await call("PUT", `/catatan-keuangan/pinjaman/${idC}/lunasi`, {
    Sumber_Dana: "Tunai",
  });
  c = await ambil(idC);
  check(
    "Lunasi berhasil, status Lunas, sisa Rp0",
    r.status === 200 &&
      c?.statusPinjaman === "Lunas" &&
      c?.totalYangHarusDibayar === 0,
    `${info(r)} | status=${c?.statusPinjaman}, sisa=${rp(c?.totalYangHarusDibayar ?? 0)}`
  );
  check("C: mode = lunas", c?.mode === "lunas", `mode=${c?.mode}`);

  r = await call("PUT", `/catatan-keuangan/pinjaman/${idC}/lunasi`, {});
  check("Lunasi lagi ditolak 400", r.status === 400, info(r));

  r = await call("PUT", `/catatan-keuangan/pinjaman/${idC}/perpanjang`, {
    jatuhTempoBaru: iso(90 * DAY),
  });
  check("Perpanjang pinjaman yang sudah lunas ditolak 400", r.status === 400, info(r));

  r = await call("PUT", `/catatan-keuangan/pinjaman/${idC}/bayar`, {
    nominalBayar: 100000,
  });
  check("Bayar cicilan pinjaman yang sudah lunas ditolak 400", r.status === 400, info(r));

  // 7. Transaksi
  section("7. Transaksi tercatat");
  const tr = await call("GET", "/catatan-keuangan");
  const trText = JSON.stringify(tr.json);
  check(
    `Ada "Bayar Cicilan: ${nA}"`,
    trText.includes(`Bayar Cicilan: ${nA}`)
  );
  check(
    `Ada "Pelunasan: ${nC}"`,
    trText.includes(`Pelunasan: ${nC}`)
  );

  // 8. Keamanan
  section("8. Keamanan (tanpa token)");
  r = await call("PUT", `/catatan-keuangan/pinjaman/${idA}/lunasi`, {}, false);
  check("Lunasi tanpa token = 401", r.status === 401, info(r));
  r = await call(
    "PUT",
    `/catatan-keuangan/pinjaman/${idA}/perpanjang`,
    { jatuhTempoBaru: iso(90 * DAY) },
    false
  );
  check("Perpanjang tanpa token = 401", r.status === 401, info(r));

  // Tabel akhir
  section("Kondisi akhir pinjaman uji");
  const all = await call("GET", "/catatan-keuangan/pinjaman");
  console.table(
    (all.json.data || [])
      .filter((p) => [idA, idB, idC].includes(p._id))
      .map((p) => ({
        nama: p.namaPlatform,
        sisa: p.totalYangHarusDibayar,
        minimum: p.cicilanMinimum,
        tempo: String(p.jatuhTempo).slice(0, 10),
        sisaHari: p.sisaHari,
        mode: p.mode,
        status: p.statusPinjaman,
      }))
  );

  // Bersihkan
  if (!KEEP) {
    for (const id of [idA, idB, idC]) {
      await call("DELETE", `/catatan-keuangan/pinjaman/${id}`);
    }
    console.log(
      `${D}Pinjaman uji sudah dihapus (transaksi hasil tes tetap ada). Pakai KEEP=1 untuk menyimpannya.${X}`
    );
  }

  // Ringkasan
  const total = pass + fail;
  const warna = fail === 0 ? G : R;
  console.log(
    `\n${B}${warna}HASIL: ${pass}/${total} lulus${fail ? `, ${fail} GAGAL` : ""}${X}\n`
  );
  process.exit(fail ? 1 : 0);
})().catch((e) => {
  console.log(`${R}Error: ${e.message}${X}`);
  process.exit(1);
});