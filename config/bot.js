const {
  ADMIN_TELEGRAM_BOT_TOKEN,
  CUST_TELEGRAM_BOT_TOKEN,
} = require("./config");
const { Bot } = require("grammy");

const custBot = new Bot(CUST_TELEGRAM_BOT_TOKEN);
const admBot = new Bot(ADMIN_TELEGRAM_BOT_TOKEN);

module.exports = { custBot, admBot };
