const { startCommand, halamanUtama } = require("./customerController");
const {
  daftarGamesBtn,
  gamesPaginationCb,
  cariGamesBtn,
  onSearchGamesInput,
  searchGamesPaginationCb,
  gameDetailsCb,
  productsWithPaginationCb,
  batalkanPemesananBtn,
  selectProductCb,
  onUserIdInput,
  serversWithPaginationCb,
  selectGameServerCb,
  onServerInput,
  paymentMethodCb,
  onCashtagInput,
  orderConfirmCb,
  refreshInvoiceCb,
} = require("./gameControllers");
const {
  cekTransaksiBtn,
  onCekTransaksiInput,
  riwayatTransaksiBtn,
  riwayatTransaksiCb,
} = require("./transactionController");

const custController = {
  startCommand,
  halamanUtama,
  daftarGamesBtn,
  gamesPaginationCb,
  cariGamesBtn,
  onSearchGamesInput,
  searchGamesPaginationCb,
  gameDetailsCb,
  productsWithPaginationCb,
  batalkanPemesananBtn,
  selectProductCb,
  onUserIdInput,
  serversWithPaginationCb,
  selectGameServerCb,
  onServerInput,
  paymentMethodCb,
  onCashtagInput,
  orderConfirmCb,
  refreshInvoiceCb,
  cekTransaksiBtn,
  onCekTransaksiInput,
  riwayatTransaksiBtn,
  riwayatTransaksiCb,
};

module.exports = custController;
