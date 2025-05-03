const FeeType = {
  PERCENTAGE: "percentage",
  AMOUNT: "amount",
};

const OrderStatuses = {
  PENDING_PAYMENT: "1",
  PENDING_ORDER: "2",
  SUCCESS: "3",
  FAILED: "4",
  EXPIRED: "5",
  PROCESSING: "6",
};

const PaymentAction = {
  CHECKOUT_URL: "checkoutUrl",
  QR_STRING: "qrString",
  PAYMENT_CODE: "paymentCode",
};
module.exports = { FeeType, OrderStatuses, PaymentAction };
