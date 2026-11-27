const express = require("express");
const router = express.Router();
const chargebacksController = require("../controllers/chargebacks/chargebacks.controller");
const { authMiddleware } = require("../middleware/auth.middleware");
const {
  initiateChargebackValidation,
  updateChargebackStatusValidation,
  respondToChargebackValidation,
  resolveDisputeValidation,
  reverseChargebackValidation,
  getChargebackValidation,
  getChargebacksValidation,
} = require("../controllers/chargebacks/chargebacks.validation");

const forceMerchantAccess = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized: No user found",
    });
  }

  const allowedRoles = ["USER", "ADMIN", "SUPER_ADMIN"];
  const userRole = req.user.role;

  if (!allowedRoles.includes(userRole)) {
    return res.status(403).json({
      success: false,
      message: `Forbidden: ${userRole} role does not have access. Required roles: ${allowedRoles.join(", ")}`,
    });
  }

  next();
};

router.use(authMiddleware);
router.get(
  "/stats",
  forceMerchantAccess,
  chargebacksController.getChargebackStats,
);
router.get(
  "/export/csv",
  forceMerchantAccess,
  chargebacksController.exportChargebacksCSV,
);
router.post(
  "/",
  forceMerchantAccess,
  initiateChargebackValidation,
  chargebacksController.initiateChargeback,
);
router.get(
  "/",
  forceMerchantAccess,
  getChargebacksValidation,
  chargebacksController.getAllChargebacks,
);
router.get(
  "/:id",
  forceMerchantAccess,
  getChargebackValidation,
  chargebacksController.getChargebackById,
);
router.patch(
  "/:id/status",
  (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    if (!["ADMIN", "SUPER_ADMIN"].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: ${req.user.role} role does not have access. Required roles: ADMIN, SUPER_ADMIN`,
      });
    }
    next();
  },
  updateChargebackStatusValidation,
  chargebacksController.updateChargebackStatus,
);
router.post(
  "/:id/respond",
  forceMerchantAccess,
  respondToChargebackValidation,
  chargebacksController.respondToChargeback,
);
router.post(
  "/:id/resolve",
  (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    if (!["ADMIN", "SUPER_ADMIN"].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: ${req.user.role} role does not have access. Required roles: ADMIN, SUPER_ADMIN`,
      });
    }
    next();
  },
  resolveDisputeValidation,
  chargebacksController.resolveDispute,
);
router.post(
  "/:id/reverse",
  (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    if (!["ADMIN", "SUPER_ADMIN"].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: ${req.user.role} role does not have access. Required roles: ADMIN, SUPER_ADMIN`,
      });
    }
    next();
  },
  reverseChargebackValidation,
  chargebacksController.reverseChargeback,
);

module.exports = router;
