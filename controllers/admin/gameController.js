const { editGame, downloadImage } = require("../../services/adminService");
const {
  getAllGames,
  getAvailGames,
  getGameDetails,
} = require("../../services/gameService");
const { createGamesInlineKeyboard } = require("../../utils/pagination");
const { TELEGRAM_BOT_TOKEN } = require("../../config/config");

const gamesPerPage = 16;
module.exports = {
  kelolaGamesBtn: async (ctx) => {
    ctx.reply("Silahkan pilih game untuk dikelola", {
      reply_markup: {
        keyboard: [
          [{ text: "Daftar Games" }, { text: "Cari Games" }],
          [{ text: "Kembali [Halaman Utama]" }],
        ],
        resize_keyboard: true,
        one_time_keyboard: true,
      },
    });
  },

  daftarGamesBtn: async (ctx) => {
    try {
      const gameList = await getAvailGames("");
      const totalPages = Math.ceil(gameList.length / gamesPerPage);

      // Store in session
      ctx.session = {
        ...ctx.session,
        gameList,
        currentGamePage: 0,
        totalGamePages: totalPages,
      };

      // Send first page
      const options = {
        reply_markup: {
          inline_keyboard: createGamesInlineKeyboard(
            gameList,
            0,
            gamesPerPage,
            totalPages
          ),
        },
      };

      await ctx.reply("Silahkan pilih game untuk dikelola", options);
    } catch (error) {
      await ctx.reply(error.message);
    }
  },

  gamesPaginationCb: async (ctx) => {
    const data = ctx.callbackQuery.data;

    // Ensure session exists
    if (!ctx.session.gameList.length) return;

    if (data === "nextGameList") {
      ctx.session.currentGamePage++;
    } else if (data === "prevGameList") {
      ctx.session.currentGamePage--;
    }

    // Ensure currentGamePage is within bounds
    if (ctx.session.currentGamePage < 0) ctx.session.currentGamePage = 0;
    if (ctx.session.currentGamePage >= ctx.session.totalGamePages)
      ctx.session.currentGamePage = ctx.session.totalGamePages - 1;

    // Update pagination
    const options = {
      reply_markup: {
        inline_keyboard: createGamesInlineKeyboard(
          ctx.session.gameList,
          ctx.session.currentGamePage,
          gamesPerPage,
          ctx.session.totalGamePages
        ),
      },
    };

    // Edit message instead of sending a new one
    await ctx.editMessageText("Silahkan pilih game untuk dikelola", options);
  },

  cariGamesBtn: async (ctx) => {
    ctx.session.currentGamePage = 0;
    ctx.reply("Silahkan kirim nama game yang ingin dicari:");
    ctx.session.currentMode = "searchGames";
  },

  onSearchGameInput: async (ctx) => {
    const query = ctx.message.text;

    try {
      const gameResult = await getAllGames(ctx, query);
      const totalPages = Math.ceil(gameResult.data.length / gamesPerPage);

      ctx.session.gameList = gameResult.data;
      ctx.session.searchGameQuery = query;
      ctx.session.totalGamePages = totalPages;
      ctx.session.currentGamePage = 0;

      // Check if results exist
      if (gameResult.data.length > 0) {
        const options = {
          reply_markup: {
            inline_keyboard: createGamesInlineKeyboard(
              gameResult.data,
              0,
              gamesPerPage,
              totalPages,
              query
            ),
          },
        };
        await ctx.reply("Hasil pencarian:", options);
      } else {
        await ctx.reply("Game tidak ditemukan");
      }
    } catch (error) {
      await ctx.reply(error.message);
    }
    ctx.session.currentMode = "";
  },

  searchGamesPaginationCb: async (ctx) => {
    const data = ctx.callbackQuery.data;
    console.log(ctx.session.gameList);
    if (!ctx.session.gameList.length) return;

    if (data.match(/^nextGameList:(.+)$/)) {
      ctx.session.currentGamePage++;
    } else if (data.match(/^prevGameList:(.+)$/)) {
      ctx.session.currentGamePage--;
    }

    // Ensure the page is within valid bounds
    if (ctx.session.currentGamePage < 0) ctx.session.currentGamePage = 0;
    if (ctx.session.currentGamePage >= ctx.session.totalGamePages)
      ctx.session.currentGamePage = ctx.session.totalGamePages - 1;

    const options = {
      reply_markup: {
        inline_keyboard: createGamesInlineKeyboard(
          ctx.session.gameList,
          ctx.session.currentGamePage,
          gamesPerPage,
          ctx.session.totalGamePages,
          ctx.session.searchGameQuery
        ),
      },
    };

    await ctx.editMessageText("Hasil pencarian:", options);
  },

  gameDetailsCb: async (ctx) => {
    const gameSlug = ctx.callbackQuery.data.split(":")[1];
    try {
      const gameDetails = await getGameDetails(gameSlug);
      ctx.session.selectedGame = gameDetails;

      const options = {
        caption: ` 
          <b>${gameDetails.name}</b> \n
          ${gameDetails.description.slice(0, 300).replace(/<[^>]*>/g, "")}
          `,
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "Aktifkan",
                callback_data: `gameEnable:${gameDetails.id}`,
              },
              {
                text: "Nonaktifkan",
                callback_data: `gameDisable:${gameDetails.id}`,
              },
            ],
            [
              {
                text: "Ubah Deskripsi",
                callback_data: `changeGameDesc:${gameDetails.id}`,
              },
              {
                text: "Ubah Nama",
                callback_data: `changeGameName:${gameDetails.id}`,
              },
            ],
          ],
        },
      };

      await ctx.replyWithPhoto(
        gameDetails.logoUrl.trim() ||
          "https://img.freepik.com/free-vector/joystick-game-sport-technology_138676-2045.jpg",
        options
      );
    } catch (error) {
      await ctx.reply(error.message);
    }
  },

  toggleGameStatusCb: async (ctx, deleted) => {
    const gameId = ctx.callbackQuery.data.split(":")[1];
    const game = ctx.session.gameList.find((game) => game.id === gameId);
    if (game.id) {
      const formData = new FormData();
      formData.append("id", game.id);
      formData.append("name", game.name);
      formData.append("type", game.type);
      formData.append("slug", game.slug);
      formData.append("categoryId", game.categoryId);
      formData.append(
        "desc",
        game.description || "Game ini belum memiliki deskripsi"
      );
      formData.append("keywords", JSON.stringify(game.keywords));
      formData.append("deleted", deleted);

      if (game.needServerId) {
        listServerId = game.listServer.map((server) => ({
          label: server.label,
          value: server.value,
        }));
        formData.append("needServerId", game.needServerId);
        formData.append("typeServerId", game.typeServerId);
        formData.append("listServerId", JSON.stringify(listServerId));
      } else {
        formData.append("listServerId", JSON.stringify([]));
      }

      try {
        const game = await editGame(formData, ctx);
        if (game) {
          ctx.reply(
            deleted
              ? "Berhasil menonaktifkan game"
              : "Berhasil mengaktifkan game"
          );
        }
      } catch (error) {
        ctx.reply(error.message);
      }
    }
  },

  changeGameNameCb: async (ctx) => {
    const gameId = ctx.callbackQuery.data.split(":")[1];
    const game = ctx.session.gameList.find((game) => game.id === gameId);
    if (game.id) {
      ctx.reply(`Silahkan masukkan nama baru untuk game ${game.name}`);
      ctx.session.currentMode = `changeGameName:${game.id}`;
    }
  },

  onChangeGameNameInput: async (ctx) => {
    const gameId = ctx.session.currentMode.split(":")[1];
    const game = ctx.session.gameList.find((game) => game.id === gameId);
    if (game.id) {
      const formData = new FormData();
      formData.append("id", game.id);
      formData.append("name", ctx.message.text);
      formData.append("type", game.type);
      formData.append("slug", game.slug);
      formData.append("categoryId", game.categoryId);
      formData.append(
        "desc",
        game.description || "Game ini belum memiliki deskripsi"
      );
      formData.append("keywords", JSON.stringify(game.keywords));

      if (game.needServerId) {
        listServerId = game.listServer.map((server) => ({
          label: server.label,
          value: server.value,
        }));
        formData.append("needServerId", game.needServerId);
        formData.append("typeServerId", game.typeServerId);
        formData.append("listServerId", JSON.stringify(listServerId));
      } else {
        formData.append("listServerId", JSON.stringify([]));
      }

      try {
        const game = await editGame(formData, ctx);
        if (game) {
          ctx.reply("Berhasil mengubah nama game");
        }
      } catch (error) {
        ctx.reply(error.message);
      }
    }

    ctx.session.currentMode = "";
  },

  changeGameDescCb: async (ctx) => {
    const gameId = ctx.callbackQuery.data.split(":")[1];
    const game = ctx.session.gameList.find((game) => game.id === gameId);
    if (game.id) {
      ctx.reply(`Silahkan masukkan deskripsi baru untuk game ${game.name}`);
      ctx.session.currentMode = `changeGameDesc:${game.id}`;
    }
  },

  onChangeGameDescInput: async (ctx) => {
    const gameId = ctx.session.currentMode.split(":")[1];
    const game = ctx.session.gameList.find((game) => game.id === gameId);
    if (game.id) {
      const formData = new FormData();
      formData.append("id", game.id);
      formData.append("name", game.name);
      formData.append("type", game.type);
      formData.append("slug", game.slug);
      formData.append("categoryId", game.categoryId);
      formData.append("desc", ctx.message.text);
      formData.append("keywords", JSON.stringify(game.keywords));

      if (game.needServerId) {
        listServerId = game.listServer.map((server) => ({
          label: server.label,
          value: server.value,
        }));
        formData.append("needServerId", game.needServerId);
        formData.append("typeServerId", game.typeServerId);
        formData.append("listServerId", JSON.stringify(listServerId));
      } else {
        formData.append("listServerId", JSON.stringify([]));
      }

      try {
        const game = await editGame(formData, ctx);
        if (game) {
          ctx.reply("Berhasil mengubah deskripsi game");
        }
      } catch (error) {
        ctx.reply(error.message);
      }
    }

    ctx.session.currentMode = "";
  },

  changeGameImageCb: async (ctx) => {
    const gameId = ctx.callbackQuery.data.split(":")[1];
    const game = ctx.session.gameList.find((game) => game.id === gameId);
    if (game.id) {
      ctx.reply("Silahkan kirimkan gambar baru untuk game ini");
      ctx.session.currentMode = `changeGameImage:${game.id}`;
    }
  },

  onChangeGameImageInput: async (ctx) => {
    if (!ctx.message.photo[0]) {
      ctx.reply("Mohon kirimkan gambar yang di kompress");
    }

    const fileId = ctx.message.photo[0].file_id;
    const file = await ctx.api.getFile(fileId);
    const fileUrl = `https://api.telegram.org/file/bot${TELEGRAM_BOT_TOKEN}/${file.file_path}`;

    const imageBuffer = await downloadImage(fileUrl);

    const gameId = ctx.session.currentMode.split(":")[1];
    const game = ctx.session.gameList.find((game) => game.id === gameId);
    if (game.id) {
      const formData = new FormData();
      formData.append("id", game.id);
      formData.append("name", game.name);
      formData.append("type", game.type);
      formData.append("slug", game.slug);
      formData.append("categoryId", game.categoryId);
      formData.append("desc", game.description);
      formData.append("keywords", JSON.stringify(game.keywords));
      formData.append("deleted", game.deleted);
      formData.append("logoUrl", imageBuffer, { contentType: "image/jpeg" });

      if (game.needServerId) {
        listServerId = game.listServer.map((server) => ({
          label: server.label,
          value: server.value,
        }));
        formData.append("needServerId", game.needServerId);
        formData.append("typeServerId", game.typeServerId);
        formData.append("listServerId", JSON.stringify(listServerId));
      } else {
        formData.append("listServerId", JSON.stringify([]));
      }

      try {
        const game = await editGame(formData, ctx);
        if (game) {
          ctx.reply("Berhasil mengubah gambar game");
        }
      } catch (error) {
        ctx.reply(error.message);
      }
    }

    ctx.session.currentMode = "";
  },
};
