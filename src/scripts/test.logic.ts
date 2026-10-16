
//Transactions harus berupa array yang berisi daftar objek transaksi
const transactions = [
  { id: 1, type: 'INCOME', amount: 1000, createdAt: '2026-07-10' },
  { id: 2, type: 'EXPENSE', amount: 2500, createdAt: '2026-07-12' },
  { id: 3, type: 'INCOME', amount: 6000, createdAt: '2026-07-15' },
  { id: 4, type: 'EXPENSE', amount: 1000, createdAt: '2026-07-20' },
];

//Logic menghitung Total Pemasukan
const totalPemasukan = transactions
  .filter(t => t.type === 'INCOME')
  .reduce((acc, curr) => acc + curr.amount, 0);

//Logic menghitung Total Pengeluaran
const totalPengeluaran = transactions
  .filter(t => t.type === 'EXPENSE')
  .reduce((acc, curr) => acc + curr.amount, 0);

//Saldo sekarang
const currentSaldo = 12500;
//Saldo Akhir
const saldoSekarang = (currentSaldo + totalPemasukan) - totalPengeluaran;

//Cetak hasil untuk testing
console.log("Saldo sebelum ada pemasukan dan pengeluaran:", currentSaldo)
console.log("Total Pemasukan   :", totalPemasukan); 
console.log("Total Pengeluaran :", totalPengeluaran); 
console.log("Saldo Sekarang    :", saldoSekarang);    
