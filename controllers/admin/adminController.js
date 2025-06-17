const { InputFile } = require("grammy");
const dayjs = require("dayjs");
const {
  loginAdmin,
  getOrderAnalytics,
  getRevenue,
} = require("../../services/adminService");
const { getAllOrders } = require("../../services/transactionService");
const { currencyConverter } = require("../../utils/formatter");
const { getStatusPayment } = require("../../utils/invoice");
const { createTransactionHistoryRes } = require("../../utils/pagination");
const {
  getAnalyticsForDateRange,
  formatAnalyticsData,
  generateRevenueReport,
  createPdfWithTable,
} = require("../../utils/monthlyReport");

const trxPerPage = 10;

module.exports = {
  startCommand: async (ctx) => {
    const keyboard = [[{ text: "Login Admin" }]];

    const options = {
      reply_markup: {
        keyboard,
        resize_keyboard: true,
        one_time_keyboard: true,
      },
    };

    ctx.reply("Selamat datang di bot admin topup gameku", options);
  },

  adminBtn: async (ctx) => {
    await ctx.reply("Halaman Admin", {
      reply_markup: {
        keyboard: [
          [{ text: "Daftar Transaksi" }, { text: "Kelola Games" }],
          [{ text: "Laporan Pendapatan" }],
        ],
        resize_keyboard: true,
        one_time_keyboard: true,
      },
    });
  },

  onAdminLoginInput: async (ctx) => {
    const username = ctx.message.text.split(":")[0];
    const password = ctx.message.text.split(":")[1];

    try {
      const adminData = await loginAdmin(username, password, ctx);
      if (adminData.id) {
        ctx.reply("Berhasil login", {
          reply_markup: {
            keyboard: [
              [{ text: "Daftar Transaksi" }, { text: "Kelola Games" }],
              [{ text: "Laporan Pendapatan" }],
            ],
            resize_keyboard: true,
            one_time_keyboard: true,
          },
        });
      }
    } catch (error) {
      ctx.reply(error.message);
    }

    ctx.session.currentMode = "";
  },

  daftarTransaksiBtn: async (ctx) => {
    try {
      const daftarTransaksi = await getAllOrders(ctx);
      const totalPages = Math.ceil(daftarTransaksi.data.length / trxPerPage);

      ctx.session.trxList = daftarTransaksi.data;
      ctx.session.totalTrxPages = totalPages;

      const responseText = daftarTransaksi.data
        .slice(0, 9)
        .map(
          (transaksi) =>
            `<b><u>Transaksi pada ${dayjs(transaksi.createdAt).format(
              "DD/MM/YYYY"
            )}</u></b>\n` +
            `Invoice --> <code>${transaksi.invoiceId}</code>\n` +
            `Status --> ${
              getStatusPayment(transaksi.status, new Date()).statusText
            }\n` +
            `Game --> ${transaksi.game}\n` +
            `Produk --> ${transaksi.productName}\n` +
            `Metode Bayar --> ${transaksi.paymentMethod}\n` +
            `Total Bayar --> ${currencyConverter(transaksi.totalAmt)}\n\n`
        );
      ctx.reply(
        "<u><b>100 Transaksi Terbaru</b></u> \n\n" + responseText.join(""),
        {
          reply_markup: {
            inline_keyboard: [
              [{ text: "Selanjutnya >>", callback_data: `nextTrxList` }],
            ],
            resize_keyboard: true,
            one_time_keyboard: true,
          },
          parse_mode: "HTML",
        }
      );
    } catch (error) {
      ctx.reply(error.message);
    }
  },

  trxWithPaginationCb: async (ctx) => {
    const data = ctx.callbackQuery.data;

    // Ensure session exists
    if (!ctx.session.trxList.length) return;

    if (data === "nextTrxList") {
      ctx.session.trxPage++;
    } else if (data === "prevTrxList") {
      ctx.session.trxPage--;
    }

    // Ensure currentGamePage is within bounds
    if (ctx.session.trxPage < 0) ctx.session.trxPage = 0;
    if (ctx.session.trxPage >= ctx.session.totalTrxPages)
      ctx.session.trxPage = ctx.session.totalTrxPages - 1;

    const { inline_keyboard, trxToDisplay } = createTransactionHistoryRes(
      ctx.session.trxList,
      ctx.session.trxPage,
      trxPerPage,
      ctx.session.totalTrxPages
    );

    const responseText = trxToDisplay.map(
      (transaksi) =>
        `<b><u>Transaksi pada ${dayjs(transaksi.createdAt).format(
          "DD/MM/YYYY"
        )}</u></b>\n` +
        `Invoice --> <code>${transaksi.invoiceId}</code>\n` +
        `Status --> ${
          getStatusPayment(transaksi.status, new Date()).statusText
        }\n` +
        `Game --> ${transaksi.game}\n` +
        `Produk --> ${transaksi.productName}\n` +
        `Metode Bayar --> ${transaksi.paymentMethod}\n` +
        `Total Bayar --> ${currencyConverter(transaksi.totalAmt)}\n\n`
    );

    // Update pagination
    const options = {
      reply_markup: {
        inline_keyboard,
      },
      parse_mode: "HTML",
    };

    // Edit message instead of sending a new one
    await ctx.editMessageText(
      "<u><b>100 Transaksi Terbaru</b></u> \n\n" + responseText.join(""),
      options
    );
  },
  laporanPendapatanBtn: async (ctx) => {
    let startDate = dayjs().startOf("month").toISOString();
    let endDate = dayjs().endOf("month").toISOString();

    try {
      let orderAnalytics = await getOrderAnalytics(startDate, endDate, ctx);
      let revenue = await getRevenue(startDate, endDate, ctx);
      let message =
        `<u><b>Laporan Pendapatan Bulan Ini</b></u> \n\n` +
        `Order Pending --> ${orderAnalytics?.data?.statusCount.pending.total} \n` +
        `Order Sukses --> ${orderAnalytics?.data?.statusCount.success.total} \n` +
        `Order Gagal --> ${orderAnalytics?.data?.statusCount.failed.total} \n` +
        `Order Kadaluarsa --> ${orderAnalytics?.data?.statusCount.expired.total} \n` +
        `Pembeli Baru --> ${orderAnalytics?.data?.newBuyersCount} \n` +
        `Pembeli Baru --> ${orderAnalytics?.data?.totalOrders.total} \n` +
        `Total Pendapatan --> ${currencyConverter(
          revenue?.data?.revenue || 0
        )} \n`;
      await ctx.reply(message, { parse_mode: "HTML" });

      startDate = dayjs().subtract(1, "month").startOf("month").toISOString();
      endDate = dayjs(startDate).endOf("month").toISOString();

      orderAnalytics = await getOrderAnalytics(startDate, endDate, ctx);
      revenue = await getRevenue(startDate, endDate, ctx);
      message =
        `<u><b>Laporan Pendapatan Bulan Sebelumnya</b></u> \n\n` +
        `Order Pending --> ${orderAnalytics?.data?.statusCount.pending.total} \n` +
        `Order Sukses --> ${orderAnalytics?.data?.statusCount.success.total} \n` +
        `Order Gagal --> ${orderAnalytics?.data?.statusCount.failed.total} \n` +
        `Order Kadaluarsa --> ${orderAnalytics?.data?.statusCount.expired.total} \n` +
        `Pembeli Baru --> ${orderAnalytics?.data?.newBuyersCount} \n` +
        `Total Pembelian --> ${orderAnalytics?.data?.totalOrders.total} \n` +
        `Total Pendapatan --> ${currencyConverter(
          revenue?.data?.revenue || 0
        )} \n`;
      await ctx.reply(message, { parse_mode: "HTML" });
    } catch (error) {
      ctx.reply(error.message);
    }
  },
  // laporanPendapatanBtn: async (ctx) => {
  //   try {
  //     // 1. Ambil data dari database
  //     const currentStart = dayjs().startOf("month").toISOString();
  //     const currentEnd = dayjs().endOf("month").toISOString();
  //     const prevStart = dayjs()
  //       .subtract(1, "month")
  //       .startOf("month")
  //       .toISOString();
  //     const prevEnd = dayjs(prevStart).endOf("month").toISOString();

  //     console.log(currentStart, currentEnd);
  //     console.log(prevStart, prevEnd);

  //     const [currentData, prevData] = await Promise.all([
  //       getAnalyticsForDateRange(currentStart, currentEnd, ctx),
  //       getAnalyticsForDateRange(prevStart, prevEnd, ctx),
  //     ]);

  //     // 2. Format data untuk tabel
  //     const tableData = [
  //       {
  //         category: "Order Pending",
  //         current:
  //           currentData.orderAnalytics?.data?.statusCount.pending.total || 0,
  //         previous:
  //           prevData.orderAnalytics?.data?.statusCount.pending.total || 0,
  //       },
  //       {
  //         category: "Order Sukses",
  //         current:
  //           currentData.orderAnalytics?.data?.statusCount.success.total || 0,
  //         previous:
  //           prevData.orderAnalytics?.data?.statusCount.success.total || 0,
  //       },
  //       {
  //         category: "Order Gagal",
  //         current:
  //           currentData.orderAnalytics?.data?.statusCount.failed.total || 0,
  //         previous:
  //           prevData.orderAnalytics?.data?.statusCount.failed.total || 0,
  //       },
  //       {
  //         category: "Pembeli Baru",
  //         current: currentData.orderAnalytics?.data?.newBuyersCount || 0,
  //         previous: prevData.orderAnalytics?.data?.newBuyersCount || 0,
  //       },
  //       {
  //         category: "Total Pembelian",
  //         current: currentData.orderAnalytics?.data?.totalOrders.total || 0,
  //         previous: prevData.orderAnalytics?.data?.totalOrders.total || 0,
  //       },
  //       {
  //         category: "Total Pendapatan",
  //         current: currentData.revenue?.data?.revenue || 0,
  //         previous: prevData.revenue?.data?.revenue || 0,
  //       },
  //     ];

  //     // 3. Generate PDF dengan tabel
  //     const pdfBytes = await createPdfWithTable(tableData);
  //     const fileName = `Laporan_Pendapatan_${dayjs().format("YYYYMMDD")}.pdf`;

  //     // 4. Kirim ke pengguna
  //     await ctx.replyWithDocument(new InputFile(pdfBytes, fileName), {
  //       caption: "Berikut laporan pendapatan bulanan",
  //     });
  //   } catch (error) {
  //     console.error("Error:", error);
  //     await ctx.reply("Terjadi kesalahan saat membuat laporan");
  //   }
  // },
};
