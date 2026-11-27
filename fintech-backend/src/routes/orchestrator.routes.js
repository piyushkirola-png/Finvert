const express = require("express");
const router = express.Router();
const orchestratorController = require("../controllers/payin-requests/Orchestrator/orchestrator.controller");
const {
  authMiddleware: authenticate,
} = require("../middleware/auth.middleware");
const { authorize } = require("../middleware/roles.middleware");

router.use(authenticate);
router.post(
  "/configure/:merchantId",
  authorize("USER", "ADMIN", "SUPER_ADMIN"),
  (req, res) => orchestratorController.configureRouting(req, res),
);
router.post(
  "/priorities/:merchantId",
  authorize("USER", "ADMIN", "SUPER_ADMIN"),
  (req, res) => orchestratorController.setGatewayPriorities(req, res),
);
router.post(
  "/load-balance/:merchantId",
  authorize("USER", "ADMIN", "SUPER_ADMIN"),
  (req, res) => orchestratorController.configureLoadBalancing(req, res),
);
router.post(
  "/payment-modes/:merchantId",
  authorize("USER", "ADMIN", "SUPER_ADMIN"),
  (req, res) => orchestratorController.configurePaymentModes(req, res),
);
router.get(
  "/preferences/:merchantId",
  authorize("USER", "ADMIN", "SUPER_ADMIN"),
  (req, res) => orchestratorController.getRoutingPreferences(req, res),
);
router.get(
  "/health/:gatewayId",
  authorize("USER", "ADMIN", "SUPER_ADMIN"),
  (req, res) => orchestratorController.getGatewayHealth(req, res),
);
router.get("/health", authorize("USER", "ADMIN", "SUPER_ADMIN"), (req, res) =>
  orchestratorController.getAllGatewayHealth(req, res),
);
router.get(
  "/failures/:payInRequestId",
  authorize("USER", "ADMIN", "SUPER_ADMIN"),
  (req, res) => orchestratorController.getFailureLogs(req, res),
);
router.get(
  "/analytics",
  authorize("USER", "ADMIN", "SUPER_ADMIN"),
  (req, res) => orchestratorController.getAnalytics(req, res),
);

module.exports = router;
