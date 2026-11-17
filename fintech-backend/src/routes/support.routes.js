const router = require("express").Router();
const ctrl = require("../controllers/support/support.controller");
const { authMiddleware } = require("../middleware/auth.middleware");
const { authorize } = require("../middleware/roles.middleware");
const { upload } = require("../middleware/upload.middleware");

router.use(authMiddleware);

router.get("/meta", ctrl.meta);

router.get("/tickets", authorize(["USER", "ADMIN"]), ctrl.listTickets);

router.post(
  "/tickets",
  authorize(["USER"]),
  upload.array("attachments", 5),
  ctrl.createTicket,
);

router.get("/tickets/:id", authorize(["USER", "ADMIN"]), ctrl.getTicket);

router.post(
  "/tickets/:id/messages",
  authorize(["USER", "ADMIN"]),
  upload.array("attachments", 5),
  ctrl.postMessage,
);

router.patch("/tickets/:id/status", authorize(["ADMIN"]), ctrl.updateStatus);

module.exports = router;
