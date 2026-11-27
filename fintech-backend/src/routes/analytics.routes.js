const express = require("express");
const router = express.Router();
const analyticsController = require("../controllers/analytics/analytics.controller");
const { authMiddleware } = require("../middleware/auth.middleware");
const { authorize } = require("../middleware/roles.middleware");

router.use(authMiddleware);
router.get(
  "/transaction-volume",
  authorize("SUPER_ADMIN", "ADMIN", "USER"),
  analyticsController.getTransactionVolume,
);
router.get(
  "/payment-methods",
  authorize("SUPER_ADMIN", "ADMIN", "USER"),
  analyticsController.getPaymentMethods,
);
router.get(
  "/hourly-volume",
  authorize("SUPER_ADMIN", "ADMIN", "USER"),
  analyticsController.getHourlyVolume,
);
router.get(
  "/gateway-performance",
  authorize("SUPER_ADMIN", "ADMIN", "USER"),
  analyticsController.getGatewayPerformance,
);
router.get(
  "/transaction-composition",
  authorize("SUPER_ADMIN", "ADMIN", "USER"),
  analyticsController.getTransactionComposition,
);
router.get(
  "/merchant-performance",
  authorize("SUPER_ADMIN", "ADMIN", "USER"),
  analyticsController.getMerchantPerformance,
);

module.exports = router;
