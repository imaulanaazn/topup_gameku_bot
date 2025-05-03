const dayjs = require("dayjs");
const { currencyConverter } = require("./formatter");
const { OrderStatuses, PaymentAction } = require("../enum");

function detailInvoiceCapt(invoice) {
  const { order, payment, product, game } = invoice;

  const detailTransaksi =
    "🧾 <b><u>Informasi Transaksi</u></b> \n\n" +
    `Invoice : <code>${invoice.order.invoiceId}</code> \n` +
    `Status : ${
      getStatusPayment(order.status, payment.expiredAt).statusText
    } \n` +
    `Tanggal Order : ${dayjs(order.createdAt).format(
      "DD MMM YYYY HH:mm"
    )} \n\n`;

  const detailInvoice =
    "🧾 <b><u>Detail Pemesanan</u></b> \n\n" +
    `${game?.name ? "Produk : " + game.name + "\n" : ""}` +
    `${product?.name ? "Denom : " + product.name + "\n" : ""}` +
    `${order.userId ? "User Id : " + order.userId + "\n" : ""}` +
    `${order.serverId ? "Server Id : " + order.serverId + "\n" : ""}` +
    `${
      payment.cd === "ID_OVO" || payment.cd === "OVOPUSH"
        ? "Nomor OVO : " + "mobileNumber" in payment.action &&
          payment.action.mobileNumber.replace("+62", "0") + "\n"
        : ""
    }` +
    `${
      payment.cd === "ID_JENIUSPAY"
        ? "Cashtag : " + "cashtag" in order.payment.action &&
          order.payment.action.cashtag + "\n"
        : ""
    }` +
    `Total Pembayaran : ${currencyConverter(order.totalAmt)} \n\n`;

  let detailPembayaran = "💳 <b><u>Informasi Pembayaran</u></b> \n\n";
  detailPembayaran += payment.cd ? `Metode : ${payment.name} \n` : "";

  if (
    (payment.cd === "ID_JENIUSPAY" ||
      payment.cd === "ID_OVO" ||
      payment.cd === "OVOPUSH") &&
    order.status === OrderStatuses.PENDING_PAYMENT
  ) {
    const paymentMethod =
      payment.cd === "ID_OVO" || payment.cd === "OVOPUSH" ? "OVO" : "JENIUS";

    detailPembayaran += `Keterangan : Silahkan cek aplikasi ${paymentMethod} mu untuk melanjutkan pembayaran. \n`;
  }

  if (
    !(
      payment.cd === "ID_JENIUSPAY" ||
      payment.cd === "ID_OVO" ||
      payment.cd === "OVOPUSH"
    ) &&
    order.status === OrderStatuses.PENDING_PAYMENT
  ) {
    if (PaymentAction.QR_STRING in payment.action && payment.action.qrString) {
      detailPembayaran += "Bayar pake QR dibawah ya 🙃";
    }
    if (
      PaymentAction.CHECKOUT_URL in payment.action &&
      payment.action.checkoutUrl
    ) {
      detailPembayaran += `<a href="${payment.action.checkoutUrl}">Klik Untuk Melanjutkan Pembayaran</a>`;
    }
    if (
      PaymentAction.PAYMENT_CODE in payment.action &&
      payment.action.paymentCode
    ) {
      detailPembayaran += `Silahkan bayar ke  : \n👉🏻 <code>${payment?.action.paymentCode}</code> 👈🏻\n\n`;
    }
  }

  return (
    getStatusPayment(order.status, payment.expiredAt).message +
    detailTransaksi +
    detailInvoice +
    detailPembayaran
  );
}

const getStatusPayment = (status, expiredAt) => {
  let msg;
  let statusText;
  switch (status) {
    case OrderStatuses.PENDING_PAYMENT:
      msg = "Silahkan lakukan pembayaran agar orderanmu segera diproses";
      msg += `. Pembayaranmu akan expired pada ${dayjs(expiredAt).format(
        "DD MMMM YYYY HH:mm"
      )}`;
      statusText = "Menunggu Pembayaran " + "🟡";
      break;
    case OrderStatuses.EXPIRED:
      msg =
        "Pesananmu sudah expired pada " +
        dayjs(expiredAt).format("DD MMMM YYYY HH:mm");
      statusText = "Kadaluarsa " + "🔴";
      break;
    case OrderStatuses.PENDING_ORDER:
    case OrderStatuses.PROCESSING:
      msg =
        "Pesananmu sedang kami proses secepatnya. Terima kasih sudah menunggu";
      statusText = "Sedang Diproses " + "🔵";
      break;
    case OrderStatuses.SUCCESS:
      msg =
        "Pesananmu sudah selesai, terima kasih sudah order denom di topup gameku";
      statusText = "Berhasil " + "🟢";
      break;
    default:
      msg =
        "Pesananmu gagal diproses. Jika sudah dibayar silahkan hubungi admin";
      statusText = "Gagal " + "🔴";
      break;
  }
  return {
    statusText,
    message: `<i>${msg}</i> \n\n`,
  };
};

module.exports = { getStatusPayment, detailInvoiceCapt };
