const express = require("express");
const router = express.Router();
const { authMiddleware } = require("../middleware/auth.middleware");
const { authorize } = require("../middleware/roles.middleware");
const payinWalletController = require("../controllers/payin-wallet/payin-wallet.controller");

router.use(authMiddleware);
router.get(
  "/",
  authorize("USER", "ADMIN", "SUPER_ADMIN"),
  payinWalletController.getWalletTransactions.bind(payinWalletController),
);
router.get(
  "/summaries",
  authorize("USER", "ADMIN", "SUPER_ADMIN"),
  payinWalletController.getWalletSummary.bind(payinWalletController),
);
router.get(
  "/export/csv",
  authorize("ADMIN", "SUPER_ADMIN", "USER"),
  payinWalletController.exportTransactionsToCSV.bind(payinWalletController),
);
router.get(
  "/:id",
  authorize("USER", "ADMIN", "SUPER_ADMIN"),
  payinWalletController.getWalletTransactionById.bind(payinWalletController),
);
router.get(
  "/merchant/:merchantId",
  authorize("ADMIN", "SUPER_ADMIN"),
  payinWalletController.getMerchantTransactions.bind(payinWalletController),
);
router.post(
  "/",
  authorize("ADMIN", "SUPER_ADMIN"),
  payinWalletController.createWalletTransaction.bind(payinWalletController),
);

module.exports = router;
