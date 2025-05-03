const { checkIsAdmin } = require("../services/adminService");

async function withAdminMidleware(callbackFn, ctx) {
  try {
    const checkAdmin = await checkIsAdmin(ctx);

    if (!checkAdmin.success) {
      ctx.session.currentMode = "adminLoginInput";

      const keyboard = [[{ text: "Login Admin" }]];

      const options = {
        reply_markup: {
          keyboard,
          resize_keyboard: true,
          one_time_keyboard: true,
        },
      };
      await ctx.reply(
        "Silahkan masukkan username dan password dengan format username:password",
        options
      );
    } else {
      await callbackFn(ctx);
    }
  } catch (error) {
    await ctx.reply(error.message);
  }
}

module.exports = { withAdminMidleware };
