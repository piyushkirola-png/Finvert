const service = require("./support.service");

exports.createTicket = async (req, res, next) => {
  try {
    const { topic, subject, message } = req.body;
    const files = req.files || [];
    res
      .status(201)
      .json(
        await service.createTicket(req.user, {
          topic,
          subject,
          message,
          files,
        }),
      );
  } catch (e) {
    next(e);
  }
};

exports.listTickets = async (req, res, next) => {
  try {
    res.json(await service.listTickets(req.user, req.query));
  } catch (e) {
    next(e);
  }
};

exports.getTicket = async (req, res, next) => {
  try {
    res.json(await service.getTicket(req.user, req.params.id));
  } catch (e) {
    next(e);
  }
};

exports.postMessage = async (req, res, next) => {
  try {
    const files = req.files || [];
    res
      .status(201)
      .json(
        await service.postMessage(
          req.user,
          req.params.id,
          req.body.body,
          files,
        ),
      );
  } catch (e) {
    next(e);
  }
};

exports.updateStatus = async (req, res, next) => {
  try {
    res.json(
      await service.updateStatus(req.user, req.params.id, req.body.status),
    );
  } catch (e) {
    next(e);
  }
};

exports.meta = (_req, res) => {
  res.json(service.meta());
};
