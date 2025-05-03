const {
  startCommand,
  adminBtn,
  onAdminLoginInput,
  daftarTransaksiBtn,
  trxWithPaginationCb,
  laporanPendapatanBtn,
} = require("./adminController");
const {
  kelolaGamesBtn,
  daftarGamesBtn,
  gamesPaginationCb,
  cariGamesBtn,
  onSearchGameInput,
  searchGamesPaginationCb,
  toggleGameStatusCb,
  changeGameNameCb,
  onChangeGameNameInput,
  changeGameDescCb,
  onChangeGameDescInput,
  changeGameImageCb,
  onChangeGameImageInput,
  gameDetailsCb,
} = require("./gameController");

const admController = {
  startCommand,
  adminBtn,
  onAdminLoginInput,
  daftarTransaksiBtn,
  trxWithPaginationCb,
  laporanPendapatanBtn,
  kelolaGamesBtn,
  daftarGamesBtn,
  gamesPaginationCb,
  cariGamesBtn,
  onSearchGameInput,
  searchGamesPaginationCb,
  toggleGameStatusCb,
  changeGameNameCb,
  onChangeGameNameInput,
  changeGameDescCb,
  onChangeGameDescInput,
  changeGameImageCb,
  onChangeGameImageInput,
  gameDetailsCb,
};

module.exports = admController;
