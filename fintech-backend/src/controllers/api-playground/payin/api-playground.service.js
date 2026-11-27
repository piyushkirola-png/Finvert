const payInRequestsService = require("../../payin-requests/payin-requests.service");

class PayinPlaygroundService {
  async createPlaygroundPayin(payload, metadata, currentUser) {
    return await payInRequestsService.create(payload, metadata, currentUser);
  }
}

module.exports = new PayinPlaygroundService();
