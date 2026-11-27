const express = require("express");
const router = express.Router();
const fxRatesController = require("../controllers/fx-rates/fx-rates.controller");
const { authMiddleware } = require("../middleware/auth.middleware");
const { authorize } = require("../middleware/roles.middleware");

router.use(authMiddleware);
router.post(
  "/fetch",
  authorize("ADMIN", "SUPER_ADMIN"),
  fxRatesController.fetchRates,
);
router.get(
  "/",
  authorize("ADMIN", "SUPER_ADMIN", "USER"),
  fxRatesController.getAllRates,
);
router.post(
  "/convert",
  authorize("ADMIN", "SUPER_ADMIN", "USER"),
  fxRatesController.convertCurrency,
);

module.exports = router;
