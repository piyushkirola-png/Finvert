const express = require("express");
const router = express.Router();
const payInWalletSummariesController = require("../controllers/payin-wallet-summaries/payin-wallet-summaries.controller");
const { authMiddleware } = require("../middleware/auth.middleware");
const { authorize } = require("../middleware/roles.middleware");

router.get(
  "/",
  authMiddleware,
  authorize("USER", "ADMIN", "SUPER_ADMIN"),
  payInWalletSummariesController.findAll,
);
router.get(
  "/merchant/:merchantId",
  authMiddleware,
  authorize("ADMIN", "SUPER_ADMIN"),
  payInWalletSummariesController.findOne,
);
router.post(
  "/merchant/:merchantId/refresh",
  authMiddleware,
  authorize("USER", "ADMIN", "SUPER_ADMIN"),
  payInWalletSummariesController.refreshSummary,
);
router.post(
  "/refresh-all",
  authMiddleware,
  authorize("ADMIN", "SUPER_ADMIN"),
  payInWalletSummariesController.refreshAllSummaries,
);

module.exports = router;
