const express = require("express");
const botControllers = require("../controllers/customer");
const router = express.Router();

router.post("/webhook", (req, res) => {
  botControllers.handleUpdate(req.body);
  res.sendStatus(200);
});

module.exports = router;
