const { session } = require("grammy");
const express = require("express");
require("dotenv").config();
const botRoutes = require("./routes/botRoutes");
const { custBot, admBot } = require("./config/bot");
const { withAdminMidleware } = require("./middleware");
const {
  INITIAL_ADMIN_CONTEXT,
  INITIAL_CUSTOMER_CONTEXT,
} = require("./constant");
const admController = require("./controllers/admin");
const custController = require("./controllers/customer");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
custBot.use(session({ initial: () => INITIAL_CUSTOMER_CONTEXT }));
admBot.use(session({ initial: () => INITIAL_ADMIN_CONTEXT }));

app.use("/bot", botRoutes);

// Bot commands
custBot.command("start", custController.startCommand);
admBot.command("start", admController.startCommand);

//ON CUSTOMER BOT MESSAGE
custBot.on("message:text", async (ctx) => {
  const text = ctx.message.text;

  if (text === "Daftar Games") {
    await custController.daftarGamesBtn(ctx);
    return;
  } else if (text === "Cari Games") {
    await custController.cariGamesBtn(ctx);
    return;
  } else if (text === "Batalkan Pemesanan") {
    await custController.batalkanPemesananBtn(ctx);
    return;
  } else if (text === "Cek Transaksi") {
    await custController.cekTransaksiBtn(ctx);
    return;
  } else if (text === "Kembali [Halaman Utama]") {
    await custController.halamanUtama(ctx);
    return;
  } else if (text === "Riwayat Transaksi") {
    await custController.riwayatTransaksiBtn(ctx);
    return;
  }

  const currentMode = ctx.session.currentMode;
  if (currentMode === "searchGames") {
    custController.onSearchGamesInput(ctx);
  } else if (currentMode === "userIdInput") {
    custController.onUserIdInput(ctx);
  } else if (currentMode === "serverInput") {
    custController.onServerInput(ctx);
  } else if (currentMode === "cashtagInput") {
    custController.onCashtagInput(ctx);
  } else if (currentMode === "cekTransaksiInput") {
    custController.onCekTransaksiInput(ctx);
  }
});

//ON ADMIN BOT MESSAGE
admBot.on("message:text", async (ctx) => {
  const text = ctx.message.text;

  if (text === "Login Admin") {
    await withAdminMidleware(admController.adminBtn, ctx);
    return;
  } else if (text === "Daftar Games") {
    await withAdminMidleware(admController.daftarGamesBtn, ctx);
    return;
  } else if (text === "Cari Games") {
    await withAdminMidleware(admController.cariGamesBtn, ctx);
    return;
  } else if (text === "Kembali [Halaman Utama]") {
    await withAdminMidleware(admController.adminBtn, ctx);
    return;
  } else if (text === "Daftar Transaksi") {
    await withAdminMidleware(admController.daftarTransaksiBtn, ctx);
    return;
  } else if (text === "Laporan Pendapatan") {
    await withAdminMidleware(admController.laporanPendapatanBtn, ctx);
    return;
  } else if (text === "Kelola Games") {
    await withAdminMidleware(admController.kelolaGamesBtn, ctx);
    return;
  }

  const currentMode = ctx.session.currentMode;
  if (currentMode === "adminLoginInput") {
    admController.onAdminLoginInput(ctx);
  } else if (currentMode === "searchGames") {
    admController.onSearchGameInput(ctx);
  } else if (currentMode.match(/^changeGameName:(.+)$/)) {
    admController.onChangeGameNameInput(ctx);
  } else if (currentMode.match(/^changeGameDesc:(.+)$/)) {
    admController.onChangeGameDescInput(ctx);
  }
});

// custBot.on("message:file", async (ctx) => {
//   const currentMode = ctx.session.currentMode;
//   if (currentMode.match(/^changeGameImage:(.+)$/)) {
//     onChangeGameImageInput(ctx);
//   }
// });

//ON CUSTOMER BOT CALLBACK
custBot.on("callback_query", async (ctx) => {
  const data = ctx.callbackQuery.data;

  if (data === "nextGameList" || data === "prevGameList") {
    custController.gamesPaginationCb(ctx);
  } else if (
    data.match(/^nextGameList:(.+)$/) ||
    data.match(/^prevGameList:(.+)$/)
  ) {
    custController.searchGamesPaginationCb(ctx);
  } else if (data.match(/^gameDetailsCb:(.+)$/)) {
    custController.gameDetailsCb(ctx);
  } else if (data.match(/nextProductList/) || data.match(/prevProductList/)) {
    custController.productsWithPaginationCb(ctx);
  } else if (data.match(/nextTrxList/) || data.match(/prevTrxList/)) {
    custController.riwayatTransaksiCb(ctx);
  } else if (data.match(/^selectProduct:(.+)$/)) {
    custController.selectProductCb(ctx);
  } else if (data.match(/^selectGameServerCb:(.+)$/)) {
    custController.selectGameServerCb(ctx);
  } else if (data.match(/^paymentMethodCb:(.+)$/)) {
    custController.paymentMethodCb(ctx);
  } else if (data === "orderConfirmCb") {
    custController.orderConfirmCb(ctx);
  } else if (data.match(/prevServerList/) || data.match(/nextServerList/)) {
    custController.serversWithPaginationCb(ctx);
  } else if (data.match(/^refreshInvoice:(.+)$/)) {
    custController.refreshInvoiceCb(ctx);
  }
});

//ON ADMIN BOT CALLBACK
admBot.on("callback_query", async (ctx) => {
  const data = ctx.callbackQuery.data;

  if (data === "nextGameList" || data === "prevGameList") {
    admController.gamesPaginationCb(ctx);
  } else if (
    data.match(/^nextGameList:(.+)$/) ||
    data.match(/^prevGameList:(.+)$/)
  ) {
    admController.searchGamesPaginationCb(ctx);
  } else if (data.match(/nextTrxList/) || data.match(/prevTrxList/)) {
    admController.trxWithPaginationCb(ctx);
  } else if (data.match(/^gameDetailsCb:(.+)$/)) {
    admController.gameDetailsCb(ctx);
  } else if (data.match(/^gameEnable:(.+)$/)) {
    admController.toggleGameStatusCb(ctx, false);
  } else if (data.match(/^gameDisable:(.+)$/)) {
    admController.toggleGameStatusCb(ctx, true);
  } else if (data.match(/^changeGameName:(.+)$/)) {
    admController.changeGameNameCb(ctx);
  } else if (data.match(/^changeGameDesc:(.+)$/)) {
    admController.changeGameDescCb(ctx);
  } else if (data.match(/^changeGameImage:(.+)$/)) {
    admController.changeGameImageCb(ctx);
  }
});

custBot.start();
admBot.start();

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
