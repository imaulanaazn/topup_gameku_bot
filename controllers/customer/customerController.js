module.exports = {
  startCommand: async (ctx) => {
    const keyboard = [
      [{ text: "Daftar Games" }, { text: "Cari Games" }],
      [{ text: "Cek Transaksi" }, { text: "Riwayat Transaksi" }],
    ];

    const options = {
      reply_markup: {
        keyboard,
        resize_keyboard: true,
        one_time_keyboard: true,
      },
    };

    ctx.reply(
      "Selamat datang di toko Topup Gameku. Tempat top up termurah dan terlengkap se indonesia",
      options
    );
  },
  halamanUtama: async (ctx) => {
    const keyboard = [
      [{ text: "Daftar Games" }, { text: "Cari Games" }],
      [{ text: "Cek Transaksi" }, { text: "Riwayat Transaksi" }],
    ];

    const options = {
      reply_markup: {
        keyboard,
        resize_keyboard: true,
        one_time_keyboard: true,
      },
    };

    await ctx.reply("Halaman Utama", options);
  },
};
