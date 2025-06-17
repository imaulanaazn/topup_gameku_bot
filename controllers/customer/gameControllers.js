const { getAvailGames, getGameDetails } = require("../../services/gameService");
const { getPaymentMethods } = require("../../services/paymentService");
const { currencyConverter } = require("../../utils/formatter");
const { FeeType, PaymentAction, OrderStatuses } = require("../../enum/index");
require("express");
const {
  createOrderProduct,
  getInvoiceDetail,
  updateStatusTV,
} = require("../../services/transactionService");

const QRCode = require("qrcode");
const { InputFile } = require("grammy");
const { detailInvoiceCapt } = require("../../utils/invoice");
const { checkIsAdmin } = require("../../services/adminService");
const { createGamesInlineKeyboard } = require("../../utils/pagination");
const { resetCartCtx } = require("../../utils/contextReset");
const { INITIAL_CUSTOMER_CONTEXT } = require("../../constant");

const gamesPerPage = 16;
const productsPerPage = 24;
const serversPerPage = 16;

module.exports = {
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

      await ctx.reply("Silahkan pilih game untuk melakukan top up", options);
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
    await ctx.editMessageText(
      "Silahkan pilih game untuk melakukan top up",
      options
    );
  },

  cariGamesBtn: async (ctx) => {
    ctx.session.currentGamePage = 0;
    ctx.reply("Silahkan kirim nama game yang ingin dicari:");
    ctx.session.currentMode = "searchGames";
  },

  onSearchGamesInput: async (ctx) => {
    const query = ctx.message.text;
    try {
      const searchResults = await getAvailGames(query);
      const totalPages = Math.ceil(searchResults.length / gamesPerPage);

      ctx.session.gameList = searchResults;
      ctx.session.searchGameQuery = query;
      ctx.session.totalGamePages = totalPages;
      ctx.session.currentGamePage = 0;

      // Check if results exist
      if (searchResults.length > 0) {
        const options = {
          reply_markup: {
            inline_keyboard: createGamesInlineKeyboard(
              searchResults,
              0,
              gamesPerPage,
              totalPages,
              query
            ),
          },
        };
        await ctx.reply("Hasil pencarian:", options);
      } else {
        await ctx.reply("Game dengan nama tersebut tidak ditemukan");
      }
    } catch (error) {
      await ctx.reply(error.message);
    }
    ctx.session.currentMode = "";
  },

  searchGamesPaginationCb: async (ctx) => {
    const data = ctx.callbackQuery.data;
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

    resetCartCtx(ctx);

    try {
      const gameDetails = await getGameDetails(gameSlug);
      ctx.session.cart.game = gameDetails;

      const gameDetailOptions = {
        caption:
          `<b>${gameDetails.name}</b> \n` +
          `${gameDetails.description.slice(0, 300).replace(/<[^>]*>/g, "")}`,
        parse_mode: "HTML",
      };

      await ctx.replyWithPhoto(
        gameDetails.logoUrl.trim() ||
          "https://img.freepik.com/free-vector/joystick-game-sport-technology_138676-2045.jpg",
        gameDetailOptions
      );

      let products = gameDetails.products;
      if (gameDetails.isGrouped) {
        products = gameDetails.groupedDenoms
          .map((group) => group.products.map((product) => product))
          .flat();
      }

      const totalPages = Math.ceil(products.length / productsPerPage);
      ctx.session.productList = products;
      ctx.session.totalProductPages = totalPages;
      ctx.session.productPage = 0;

      if (products.length > 1) {
        const options = {
          reply_markup: {
            inline_keyboard: createProductsInlineKeyboard(
              products,
              0,
              productsPerPage,
              totalPages
            ),
          },
        };
        await ctx.reply("Pilih produk untuk dibeli:", options);
      } else {
        ctx.reply("Saat ini tidak tersedia produk untuk game terkait");
      }
    } catch (error) {
      await ctx.reply(error.message);
    }
  },

  productsWithPaginationCb: async (ctx) => {
    const data = ctx.callbackQuery.data;

    if (!ctx.session.productList.length) return;

    if (data.match(/nextProductList/)) {
      ctx.session.productPage++;
    } else if (data.match(/prevProductList/)) {
      ctx.session.productPage--;
    }

    // Ensure currentAllGamesPage is within bounds
    if (ctx.session.productPage < 0) ctx.session.productPage = 0;
    if (ctx.session.productPage >= ctx.session.totalProductPages)
      ctx.session.productPage = ctx.session.totalProductPages - 1;

    const options = {
      reply_markup: {
        inline_keyboard: createProductsInlineKeyboard(
          ctx.session.productList,
          ctx.session.productPage,
          productsPerPage,
          ctx.session.totalProductPages
        ),
      },
    };

    await ctx.editMessageText("Pilih produk untuk dibeli:", options);
  },

  batalkanPemesananBtn: async (ctx) => {
    const options = {
      reply_markup: {
        keyboard: [
          [{ text: "Daftar Games" }, { text: "Cari Games" }],
          [{ text: "Cek Transaksi" }, { text: "Riwayat Transaksi" }],
        ],
        resize_keyboard: true,
        one_time_keyboard: true,
      },
    };

    resetCartCtx(ctx);
    ctx.reply("Pemesanan dibatalkan", options);
  },

  selectProductCb: async (ctx) => {
    const data = ctx.callbackQuery.data;
    const productId = data.split(":")[1];
    const game = ctx.session.cart.game;
    const product = ctx.session.productList.find(
      (product) => product.id === productId
    );

    if (product && product.id) {
      ctx.session.cart.product = product;
      ctx.session.currentMode = "userIdInput";

      const options = {
        reply_markup: {
          keyboard: [[{ text: "Batalkan Pemesanan" }]],
          resize_keyboard: true,
          one_time_keyboard: true,
        },
      };

      await ctx
        .replyWithPhoto(
          game.logoUrl ||
            "https://img.freepik.com/free-vector/joystick-game-sport-technology_138676-2045.jpg",
          {
            caption: detailPemesananCapt(ctx),
            parse_mode: "HTML",
          }
        )
        .then(async () => {
          await ctx.reply("Silahkan masukkan id akun", options);
        });
    }
  },

  onUserIdInput: async (ctx) => {
    const userId = ctx.message.text;
    ctx.session.cart.userId = userId;
    const { game, product, quantity } = ctx.session.cart;

    try {
      await ctx.replyWithPhoto(
        game.logoUrl ||
          "https://img.freepik.com/free-vector/joystick-game-sport-technology_138676-2045.jpg",
        {
          caption: detailPemesananCapt(ctx),
          parse_mode: "HTML",
        }
      );

      if (game.needServerId) {
        if (game.typeServerId === "list") {
          const totalPages = Math.ceil(game.listServer.length / serversPerPage);
          ctx.session.serverList = game.listServer;
          ctx.session.totalServerPages = totalPages;
          ctx.session.serverPage = 0;

          for (let i = 0; i <= game.listServer.length / 3; i++) {}
          const options = {
            reply_markup: {
              inline_keyboard: createServersInlineKeyboard(
                game.listServer,
                0,
                serversPerPage,
                totalPages
              ),
            },
          };
          ctx.reply("Silahkan pilih server game :", options);
        } else {
          ctx.session.currentMode = "serverInput";
          ctx.reply("Masukkan server game");
        }
      } else {
        const totalAmountBeforeFee = quantity * product.price;

        const payments = await getPaymentMethods();

        ctx.session.paymentMethods =
          payments.map((payment) => ({
            id: payment.id,
            providerCd: payment.providerCd,
            name: payment.name,
            minAmount: payment.minAmount,
            maxAmount: payment.maxAmount,
            fee: payment.fee,
            feeType: payment.feeType,
            cd: payment.cd,
            category: payment.category,
          })) || [];

        const options = {
          reply_markup: {
            inline_keyboard: payments.map((payment) => [
              {
                text:
                  payment.name +
                  " : " +
                  currencyConverter(
                    payment.providerCd === "MIDTRANS" &&
                      payment.category === "6"
                      ? Math.ceil(
                          (totalAmountBeforeFee +
                            (payment.feeType === FeeType.PERCENTAGE
                              ? (totalAmountBeforeFee * payment.fee) / 100
                              : payment.fee)) /
                            1000
                        ) * 1000
                      : totalAmountBeforeFee +
                          (payment.feeType === FeeType.PERCENTAGE
                            ? (totalAmountBeforeFee * payment.fee) / 100
                            : payment.fee)
                  ),
                callback_data: `paymentMethodCb:${payment.id}`,
              },
            ]),
          },
        };
        ctx.reply("Pilih metode pembayaran", options);
      }
    } catch (error) {
      await ctx.reply(error.message);
    }
  },

  serversWithPaginationCb: async (ctx) => {
    const data = ctx.callbackQuery.data;

    if (!ctx.session.serverList.length) return;

    if (data.match(/nextServerList/)) {
      ctx.session.serverPage++;
    } else if (data.match(/prevServerList/)) {
      ctx.session.serverPage--;
    }

    // Ensure currentAllGamesPage is within bounds
    if (ctx.session.serverPage < 0) ctx.session.serverPage = 0;
    if (ctx.session.serverPage >= ctx.session.totalServerPages)
      ctx.session.serverPage = ctx.session.totalServerPages - 1;

    const options = {
      reply_markup: {
        inline_keyboard: createServersInlineKeyboard(
          ctx.session.serverList,
          ctx.session.serverPage,
          serversPerPage,
          ctx.session.totalServerPages
        ),
      },
    };

    await ctx.editMessageText("Silahkan pilih server game :", options);
  },

  selectGameServerCb: async (ctx) => {
    const { game, product, quantity } = ctx.session.cart;
    const data = ctx.callbackQuery.data;
    const serverId = data.split(":")[1];

    gameServer = game.listServer.find((server) => server.id === serverId);

    if (gameServer) {
      ctx.session.cart.server = gameServer;
      await ctx.replyWithPhoto(
        game.logoUrl ||
          "https://img.freepik.com/free-vector/joystick-game-sport-technology_138676-2045.jpg",
        {
          caption: detailPemesananCapt(ctx),
          parse_mode: "HTML",
        }
      );

      const totalAmountBeforeFee = quantity * product.price;

      const payments = await getPaymentMethods();

      ctx.session.paymentMethods =
        payments.map((payment) => ({
          id: payment.id,
          providerCd: payment.providerCd,
          name: payment.name,
          minAmount: payment.minAmount,
          maxAmount: payment.maxAmount,
          fee: payment.fee,
          feeType: payment.feeType,
          cd: payment.cd,
          category: payment.category,
        })) || [];

      const options = {
        reply_markup: {
          inline_keyboard: payments.map((payment) => [
            {
              text:
                payment.name +
                " : " +
                currencyConverter(
                  payment.providerCd === "MIDTRANS" && payment.category === "6"
                    ? Math.ceil(
                        (totalAmountBeforeFee +
                          (payment.feeType === FeeType.PERCENTAGE
                            ? (totalAmountBeforeFee * payment.fee) / 100
                            : payment.fee)) /
                          1000
                      ) * 1000
                    : totalAmountBeforeFee +
                        (payment.feeType === FeeType.PERCENTAGE
                          ? (totalAmountBeforeFee * payment.fee) / 100
                          : payment.fee)
                ),
              callback_data: `paymentMethodCb:${payment.id}`,
            },
          ]),
        },
      };
      ctx.reply("Pilih metode pembayaran", options);
    }
  },

  onServerInput: async (ctx) => {
    const { game, product, quantity } = ctx.session.cart;
    const gameServer = ctx.message.text;
    ctx.session.cart.server = gameServer;

    try {
      await ctx.replyWithPhoto(
        game.logoUrl ||
          "https://img.freepik.com/free-vector/joystick-game-sport-technology_138676-2045.jpg",
        {
          caption: detailPemesananCapt(ctx),
          parse_mode: "HTML",
        }
      );

      const totalAmountBeforeFee = quantity * product.price;

      const payments = await getPaymentMethods();

      ctx.session.paymentMethods = payments.map((payment) => ({
        id: payment.id,
        providerCd: payment.providerCd,
        name: payment.name,
        minAmount: payment.minAmount,
        maxAmount: payment.maxAmount,
        fee: payment.fee,
        feeType: payment.feeType,
        cd: payment.cd,
        category: payment.category,
      }));

      const options = {
        reply_markup: {
          inline_keyboard: payments.map((payment) => [
            {
              text:
                payment.name +
                " : " +
                currencyConverter(
                  payment.providerCd === "MIDTRANS" && payment.category === "6"
                    ? Math.ceil(
                        (totalAmountBeforeFee +
                          (payment.feeType === FeeType.PERCENTAGE
                            ? (totalAmountBeforeFee * payment.fee) / 100
                            : payment.fee)) /
                          1000
                      ) * 1000
                    : totalAmountBeforeFee +
                        (payment.feeType === FeeType.PERCENTAGE
                          ? (totalAmountBeforeFee * payment.fee) / 100
                          : payment.fee)
                ),
              callback_data: `paymentMethodCb:${payment.id}`,
            },
          ]),
        },
      };
      ctx.reply("Pilih metode pembayaran", options);
    } catch (error) {
      ctx.reply(error.message);
    }
  },

  paymentMethodCb: async (ctx) => {
    const data = ctx.callbackQuery.data;
    const { game, product, quantity } = ctx.session.cart;
    const paymentMethods = ctx.session.paymentMethods;
    const paymentMethodId = data.split(":")[1];
    const paymentMethod = paymentMethods.find(
      (payment) => payment.id === paymentMethodId
    );

    const totalAmountBeforeFee = quantity * product.price;

    if (
      !totalAmountBeforeFee ||
      totalAmountBeforeFee > paymentMethod.maxAmount ||
      totalAmountBeforeFee < paymentMethod.minAmount
    ) {
      ctx.reply(
        totalAmountBeforeFee < paymentMethod.minAmount
          ? "Maaf, minimal transaksi" +
              currencyConverter(paymentMethod.minAmount)
          : "Maaf, maximal transaksi " +
              currencyConverter(paymentMethod.maxAmount)
      );
    } else {
      ctx.session.cart.paymentMethod = paymentMethod;
      if (paymentMethod.cd === "jenius") {
        ctx.session.currentMode = "cashtagInput";
        ctx.reply("Masukkan cashtag");
      } else {
        await ctx.replyWithPhoto(
          game.logoUrl ||
            "https://img.freepik.com/free-vector/joystick-game-sport-technology_138676-2045.jpg",
          {
            caption: detailPemesananCapt(ctx) + isOrderValid(ctx).errMessage,
            parse_mode: "HTML",
            reply_markup: {
              inline_keyboard: isOrderValid(ctx).isValid
                ? [
                    [
                      {
                        text: "Pesan Sekarang",
                        callback_data: "orderConfirmCb",
                      },
                    ],
                  ]
                : [[]],
            },
          }
        );
      }
    }
  },

  onCashtagInput: async (ctx) => {
    const cashtag = ctx.message.text;
    ctx.session.cart.cashtag = cashtag;
    const { game } = ctx.session.cart;

    await ctx.replyWithPhoto(
      game.logoUrl ||
        "https://img.freepik.com/free-vector/joystick-game-sport-technology_138676-2045.jpg",
      {
        caption: detailPemesananCapt(ctx) + isOrderValid(ctx).errMessage,
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: isOrderValid(ctx).isValid
            ? [
                [
                  {
                    text: "Pesan Sekarang",
                    callback_data: "orderConfirmCb",
                  },
                ],
              ]
            : [[]],
        },
      }
    );
  },

  orderConfirmCb: async (ctx) => {
    const { product, userId, server, paymentMethod, cashtag } =
      ctx.session.cart;

    const telegramId = ctx.from.id || "";

    const dataCheckout = {
      userId: userId,
      serverId: typeof server !== "string" ? server.id : server,
      productId: product.id,
      paymentId: paymentMethod.id,
      quantity: 1,
      telegramId: telegramId.toString(),
      cashtag: cashtag,
    };

    try {
      const response = await createOrderProduct(dataCheckout);

      await ctx.reply(
        `Order berhasil dibuat. \n Kode Invoice : <code>${response.invoice}</code>`,
        {
          parse_mode: "HTML",
          reply_markup: {
            keyboard: [
              [{ text: "Daftar Games" }, { text: "Cari Games" }],
              [{ text: "Cek Transaksi" }, { text: "Riwayat Transaksi" }],
            ],
            resize_keyboard: true,
            one_time_keyboard: true,
          },
        }
      );

      const invoiceData = await getInvoiceDetail(response.invoice);

      await ctx.replyWithPhoto(invoiceData.game.logoUrl, {
        caption: detailInvoiceCapt(invoiceData),
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "Refresh 🔁",
                callback_data: `refreshInvoice:${response.invoice}`,
              },
            ],
          ],
          resize_keyboard: true,
          one_time_keyboard: true,
        },
      });

      if (
        PaymentAction.QR_STRING in invoiceData.payment.action &&
        invoiceData.payment.action.qrString
      ) {
        const qrText = invoiceData.payment.action.qrString;
        const qrBuffer = await QRCode.toBuffer(qrText);
        await ctx.replyWithPhoto(new InputFile(qrBuffer));
      }
    } catch (error) {
      ctx.reply(error.message);
    }
  },

  refreshInvoiceCb: async (ctx) => {
    const invoice = ctx.callbackQuery.data.split(":")[1];
    try {
      const tokoVoucherStts = await updateStatusTV(invoice);
      const invoiceData = await getInvoiceDetail(
        tokoVoucherStts.data.invoiceId || ""
      );

      const options = {
        caption: detailInvoiceCapt(invoiceData),
        parse_mode: "HTML",
      };

      if (
        invoiceData.order.status === OrderStatuses.PENDING_ORDER ||
        invoiceData.order.status === OrderStatuses.PENDING_PAYMENT ||
        invoiceData.order.status === OrderStatuses.PROCESSING
      ) {
        options.reply_markup = {
          inline_keyboard: [
            [
              {
                text: "Refresh 🔁",
                callback_data: `refreshInvoice:${invoice}`,
              },
            ],
          ],
        };
      }

      await ctx.editMessageCaption(options);
    } catch (error) {
      ctx.reply(error.message);
    }
  },
};

//=====================================================================================

const createProductsInlineKeyboard = (
  productList,
  page,
  productsPerPage,
  totalPages
) => {
  const startIndex = page * productsPerPage;
  const endIndex = startIndex + productsPerPage;
  const gamesToDisplay = productList.slice(startIndex, endIndex);

  let inline_keyboard = gamesToDisplay.reduce((acc, curr, index) => {
    if (index % 1 === 0) {
      acc.push([]);
    }
    acc[acc.length - 1].push({
      text: `${curr.name} = ${currencyConverter(curr.price)}`,
      callback_data: `selectProduct:${curr.id}`,
    });
    return acc;
  }, []);

  // Add navigation buttons
  if (page > 0) {
    inline_keyboard.push([
      { text: "<< Sebelumnya", callback_data: `prevProductList` },
    ]);
  }
  if (page < totalPages - 1) {
    inline_keyboard.push([
      { text: "Selanjutnya >>", callback_data: `nextProductList` },
    ]);
  }

  return inline_keyboard;
};

const createServersInlineKeyboard = (
  serverList,
  page,
  serversPerPage,
  totalPages
) => {
  const startIndex = page * serversPerPage;
  const endIndex = startIndex + serversPerPage;
  const serversToDisplay = serverList.slice(startIndex, endIndex);

  let inline_keyboard = serversToDisplay.reduce((acc, curr, index) => {
    if (index % 1 === 0) {
      acc.push([]);
    }
    acc[acc.length - 1].push({
      text: curr.label,
      callback_data: `selectGameServerCb:${curr.id}`,
    });
    return acc;
  }, []);

  // Add navigation buttons
  if (page > 0) {
    inline_keyboard.push([
      { text: "<< Sebelumnya", callback_data: `prevServerList` },
    ]);
  }
  if (page < totalPages - 1) {
    inline_keyboard.push([
      { text: "Selanjutnya >>", callback_data: `nextServerList` },
    ]);
  }

  return inline_keyboard;
};

const isOrderValid = (ctx) => {
  const { game, paymentMethod, userId, server, product, cashtag } =
    ctx.session.cart;
  let isValid = true;
  let errMessage = "";

  if (typeof game !== "object" && !game.id) {
    isValid = false;
    errMessage = "Anda belum memilih produk";
  } else if (typeof game !== "object" && paymentMethod.id) {
    isValid = false;
    errMessage = "Anda belum memilih metode pembayaran";
  } else if (!userId) {
    isValid = false;
    errMessage = "Anda belum memasukkan user id";
  } else if (server) {
    if (typeof server === "string" && !server) {
      isValid = false;
      errMessage = "Anda belum memasukkan server";
    } else if (typeof server === "object" && !server.id) {
      isValid = false;
      errMessage = "Anda belum memasukkan server";
    }
  } else if (typeof product === "object" && !product.id) {
    isValid = false;
    errMessage = "Anda belum memilih produk";
  } else if (!paymentMethod.cd === "jenius" && !cashtag) {
    isValid = false;
    errMessage = "Anda belum memasukkan cashtag";
  }
  return {
    isValid,
    errMessage: errMessage
      ? `*<i>Tidak bisa melanjutkan pembuatan pesanan. <u>${errMessage}</u></i>*`
      : "",
  };
};

function detailPemesananCapt(ctx) {
  const { game, product, userId, server, paymentMethod, cashtag, quantity } =
    ctx.session.cart;

  const totalAmountBeforeFee = quantity * parseInt(product.price);

  const detailPemesananCapt =
    "🧾 <b><u>Detail Pemesanan</u></b> \n\n" +
    `${game?.id ? "Topup / Beli : " + game.name + "\n" : ""}` +
    `${product?.id ? "Produk : " + product.name + "\n" : ""}` +
    `${userId ? "User Id : " + userId + "\n" : ""}` +
    `${
      server?.id
        ? "Server : " + server.label + "\n"
        : server
        ? "Server : " + server + "\n"
        : ""
    }` +
    `${
      paymentMethod?.id
        ? "Metode Pembayaran : " + paymentMethod.name + "\n"
        : ""
    }` +
    `${cashtag ? "Cashtag : " + cashtag + "\n" : ""}` +
    `${
      totalAmountBeforeFee && paymentMethod?.id
        ? "Total Harga : " +
          currencyConverter(
            paymentMethod.providerCd === "TOKOPAY" &&
              paymentMethod.category === "6"
              ? Math.ceil(
                  (totalAmountBeforeFee +
                    (paymentMethod.feeType === FeeType.PERCENTAGE
                      ? (totalAmountBeforeFee * paymentMethod.fee) / 100
                      : paymentMethod.fee)) /
                    1000
                ) * 1000
              : totalAmountBeforeFee +
                  (paymentMethod.feeType === FeeType.PERCENTAGE
                    ? (totalAmountBeforeFee * paymentMethod.fee) / 100
                    : paymentMethod.fee)
          ) +
          "\n\n"
        : ""
    }`;

  return detailPemesananCapt;
}
