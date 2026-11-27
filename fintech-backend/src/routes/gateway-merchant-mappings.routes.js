const express = require("express");
const router = express.Router();
const gatewayMerchantMappingsController = require("../controllers/gateway-merchant-mappings/gateway-merchant-mappings.controller");
const { authMiddleware } = require("../middleware/auth.middleware");
const { authorize } = require("../middleware/roles.middleware");

router.use(authMiddleware);
router.use(authorize("SUPER_ADMIN", "ADMIN"));
router.get("/", gatewayMerchantMappingsController.getAllMappings);
router.get("/:id", gatewayMerchantMappingsController.getMappingById);
router.get(
  "/gateway/:gatewayId",
  gatewayMerchantMappingsController.getMappingsByGateway,
);
router.get(
  "/merchant/:merchantId",
  gatewayMerchantMappingsController.getMappingsByMerchant,
);
router.post("/", gatewayMerchantMappingsController.createMapping);
router.patch("/:id", gatewayMerchantMappingsController.updateMapping);
router.delete("/:id", gatewayMerchantMappingsController.deleteMapping);
router.post("/bulk", gatewayMerchantMappingsController.bulkCreateMappings);

module.exports = router;
