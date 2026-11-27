const express = require("express");
const router = express.Router();
const { authMiddleware } = require("../middleware/auth.middleware");
const { authorize } = require("../middleware/roles.middleware");
const payinbulkUploadController = require("../controllers/payin-requests/Bulk-upload/payin-bulk-upload.controller");
const {
  bulkUploadValidation,
  historyValidation,
  getByIdValidation,
} = require("../controllers/payin-requests/Bulk-upload/payin-bulk-upload.validation");
const { validationResult } = require("express-validator");

const validate = (validations) => {
  return async (req, res, next) => {
    await Promise.all(validations.map((validation) => validation.run(req)));

    const errors = validationResult(req);
    if (errors.isEmpty()) {
      return next();
    }

    return res.status(400).json({
      success: false,
      errors: errors.array(),
    });
  };
};

router.use(authMiddleware);
router.post(
  "/",
  authorize("USER", "ADMIN", "SUPER_ADMIN"),
  validate(bulkUploadValidation),
  (req, res, next) => {
    payinbulkUploadController.uploadFile(req, res, (err) => {
      if (err) {
        return res.status(400).json({
          success: false,
          message: err.message || "File upload failed",
        });
      }
      return payinbulkUploadController.bulkUpload(req, res, next);
    });
  },
);
router.get(
  "/template/download",
  authorize("USER", "ADMIN", "SUPER_ADMIN"),
  payinbulkUploadController.downloadTemplate,
);
router.post(
  "/schedule",
  authorize("USER", "ADMIN", "SUPER_ADMIN"),
  validate(bulkUploadValidation),
  payinbulkUploadController.scheduleUpload,
);
router.get(
  "/scheduled/:id",
  authorize("USER", "ADMIN", "SUPER_ADMIN"),
  payinbulkUploadController.getScheduledTask,
);
router.get(
  "/admin/history",
  authorize("ADMIN", "SUPER_ADMIN"),
  validate(historyValidation),
  payinbulkUploadController.getAdminHistory,
);
router.get(
  "/admin/stats",
  authorize("ADMIN", "SUPER_ADMIN"),
  payinbulkUploadController.getAdminStats,
);
router.get(
  "/admin/:id",
  authorize("ADMIN", "SUPER_ADMIN"),
  validate(getByIdValidation),
  payinbulkUploadController.getAdminBulkUploadById,
);
router.get(
  "/history",
  authorize("USER", "ADMIN", "SUPER_ADMIN"),
  validate(historyValidation),
  payinbulkUploadController.getHistory,
);
router.get(
  "/:id",
  authorize("USER", "ADMIN", "SUPER_ADMIN"),
  validate(getByIdValidation),
  payinbulkUploadController.getBulkUploadById,
);
router.get(
  "/:id/error-report",
  authorize("USER", "ADMIN", "SUPER_ADMIN"),
  validate(getByIdValidation),
  payinbulkUploadController.downloadErrorReport,
);
router.get(
  "/:id/upi-intents",
  authorize("USER", "ADMIN", "SUPER_ADMIN"),
  validate(getByIdValidation),
  payinbulkUploadController.downloadUpiIntents,
);
router.post(
  "/:id/retry",
  authorize("USER", "ADMIN", "SUPER_ADMIN"),
  payinbulkUploadController.retryFailedRows,
);

module.exports = router;
