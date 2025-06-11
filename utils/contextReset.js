const { INITIAL_CUSTOMER_CONTEXT } = require("../constant");

module.exports = {
  resetCartCtx: (ctx) => {
    ctx.session.cart = {
      game: {},
      paymentMethod: {},
      userId: "",
      server: "",
      product: {},
      quantity: 1,
      telegramId: "",
      cashtag: "",
    };
  },
  resetAllCtx: (ctx) => {
    ctx.session = INITIAL_CUSTOMER_CONTEXT;
  },
};
