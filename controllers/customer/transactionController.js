const { InputFile } = require("grammy");
const { PaymentAction, OrderStatuses } = require("../../enum");
const {
  getInvoiceDetail,
  orderHistory,
} = require("../../services/transactionService");
const { detailInvoiceCapt, getStatusPayment } = require("../../utils/invoice");
const QRCode = require("qrcode");
const { currencyConverter } = require("../../utils/formatter");
const { createTransactionHistoryRes } = require("../../utils/pagination");
const dayjs = require("dayjs");

const trxPerPage = 5;

module.exports = {
  cekTransaksiBtn: async (ctx) => {
    ctx.session.currentMode = "cekTransaksiInput";
    ctx.reply("Silahkan masukkan kode invoice transaksi");
  },
  onCekTransaksiInput: async (ctx) => {
    const invoice = ctx.message.text;
    try {
      const invoiceData = await getInvoiceDetail(invoice);

      const options = {
        caption: detailInvoiceCapt(invoiceData),
        parse_mode: "HTML",
      };

      if (
        invoiceData.order.status !== OrderStatuses.EXPIRED &&
        invoiceData.order.status !== OrderStatuses.FAILED &&
        invoiceData.order.status !== OrderStatuses.SUCCESS
      ) {
        options.reply_markup = {
          inline_keyboard: [
            [
              {
                text: "Refresh 🔁",
                callback_data: `refreshInvoice:${invoiceData.order.invoiceId}`,
              },
            ],
          ],
        };
      }

      await ctx.replyWithPhoto(invoiceData.game.logoUrl, options);
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

    ctx.session.currentMode = "";
  },
  riwayatTransaksiBtn: async (ctx) => {
    const userId = ctx.message.from.id;
    try {
      const riwayatTransaksi = await orderHistory(ctx, userId);
      const totalPages = Math.ceil(riwayatTransaksi.data.length / trxPerPage);

      ctx.session.trxList = riwayatTransaksi.data;
      ctx.session.totalTrxPages = totalPages;

      const responseText = riwayatTransaksi.data
        .slice(0, trxPerPage)
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
        "<u><b>50 Transaksi Terbaru</b></u> \n\n" + responseText.join(""),
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
  riwayatTransaksiCb: async (ctx) => {
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
      "<u><b>50 Transaksi Terbaru</b></u> \n\n" + responseText.join(""),
      options
    );
  },
};
