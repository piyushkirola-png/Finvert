const express = require("express");
const router = express.Router();
const refundsController = require("../controllers/refunds/refunds.controller");
const { authMiddleware } = require("../middleware/auth.middleware");
const { authorize } = require("../middleware/roles.middleware");
const {
  initiateRefundValidation,
  updateRefundStatusValidation,
  cancelRefundValidation,
  getRefundValidation,
  getRefundsValidation,
} = require("../controllers/refunds/refunds.validation");

router.use(authMiddleware);
router.get(
  "/stats",
  authorize("USER", "ADMIN", "SUPER_ADMIN"),
  refundsController.getRefundStats,
);
router.get(
  "/",
  authorize("USER", "ADMIN", "SUPER_ADMIN"),
  getRefundsValidation,
  refundsController.getAllRefunds,
);
router.get(
  "/:id",
  authorize("USER", "ADMIN", "SUPER_ADMIN"),
  getRefundValidation,
  refundsController.getRefundById,
);
router.post(
  "/",
  authorize("ADMIN", "SUPER_ADMIN"),
  initiateRefundValidation,
  refundsController.initiateRefund,
);
router.patch(
  "/:id/status",
  authorize("ADMIN", "SUPER_ADMIN"),
  updateRefundStatusValidation,
  refundsController.updateRefundStatus,
);
router.post(
  "/:id/cancel",
  authorize("ADMIN", "SUPER_ADMIN"),
  cancelRefundValidation,
  refundsController.cancelRefund,
);
router.get(
  "/export/csv",
  authorize("USER", "ADMIN", "SUPER_ADMIN"),
  refundsController.exportRefundsCSV,
);

module.exports = router;
