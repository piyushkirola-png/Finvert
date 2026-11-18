const fs = require("fs");
const path = require("path");
const prisma = require("../../../config/prisma");
const { decrypt } = require("../../utils/encryption.util");
const { streamCsv, formatIST } = require("../../utils/csv-stream.util");

const BATCH_SIZE = 5000;
const money = (v) => Number(v || 0).toFixed(2);

class CsvExportService {
  constructor() {
    this.exportsDir = path.join(process.cwd(), "storage", "exports");
    if (!fs.existsSync(this.exportsDir)) {
      fs.mkdirSync(this.exportsDir, { recursive: true });
    }
  }

  // ---------- request / worker ----------

  async requestCsvExport(user, exportType, options = {}) {
    const { merchantId, startDate, endDate, filters, sorts } = options;

    const csvExport = await prisma.csvExport.create({
      data: {
        userId: user.id,
        merchantId: merchantId || user.merchantId || null,
        exportType,
        filters: filters || null,
        sorts: sorts || null,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        status: "PENDING",
      },
    });

    this.generateCsvWorker(csvExport.id, user).catch((err) => {
      console.error(`Error generating CSV for export ${csvExport.id}:`, err);
    });

    return {
      exportId: csvExport.id,
      message: "CSV generation started successfully",
    };
  }

  async generateCsvWorker(exportId, user) {
    const filePath = path.join(this.exportsDir, `export-${exportId}.csv`);
    try {
      await prisma.csvExport.update({
        where: { id: exportId },
        data: { status: "PROCESSING" },
      });

      const csvExport = await prisma.csvExport.findUnique({
        where: { id: exportId },
      });
      if (!csvExport) return;

      const generators = {
        PAYIN_REQUESTS: this.exportPayInRequests,
        PAYOUT_REQUESTS: this.exportPayOutRequests,
        PAYIN_WALLETS: this.exportPayInWallets,
        PAYOUT_WALLETS: this.exportPayOutWallets,
        SETTLEMENTS: this.exportSettlements,
        CHARGEBACKS: this.exportChargebacks,
        REFUNDS: this.exportRefunds,
      };
      const generate = generators[csvExport.exportType];
      if (!generate) {
        throw new Error(`Unknown export type: ${csvExport.exportType}`);
      }

      const rows = await generate.call(this, {
        user,
        merchantId: csvExport.merchantId || undefined,
        startDate: csvExport.startDate || undefined,
        endDate: csvExport.endDate || undefined,
        filters: csvExport.filters || null,
        filePath,
      });

      if (!rows) throw new Error("No data to export");

      const stats = fs.statSync(filePath);
      await prisma.csvExport.update({
        where: { id: exportId },
        data: {
          status: "COMPLETED",
          fileUrl: filePath,
          fileSize: stats.size,
          generatedAt: new Date(),
        },
      });
    } catch (error) {
      console.error(`CSV Worker failed for export ${exportId}:`, error);
      fs.promises.unlink(filePath).catch(() => {});
      await prisma.csvExport.update({
        where: { id: exportId },
        data: { status: "FAILED" },
      });
    }
  }

  async getMyExports(user) {
    return prisma.csvExport.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        exportType: true,
        status: true,
        filters: true,
        startDate: true,
        endDate: true,
        fileSize: true,
        createdAt: true,
        updatedAt: true,
        generatedAt: true,
      },
    });
  }

  async getExportFileUrl(exportId, user) {
    const csvExport = await prisma.csvExport.findUnique({
      where: { id: exportId },
    });
    if (!csvExport) throw new Error("Export not found");
    if (
      user.role !== "ADMIN" &&
      user.role !== "SUPER_ADMIN" &&
      csvExport.userId !== user.id
    ) {
      throw new Error("Access denied");
    }
    if (csvExport.status !== "COMPLETED" || !csvExport.fileUrl) {
      throw new Error("File is not ready yet or failed to generate");
    }
    if (!fs.existsSync(csvExport.fileUrl)) {
      throw new Error("File not found on server");
    }
    return csvExport.fileUrl;
  }

  // ---------- shared helpers ----------

  scopeWhere(user, merchantId, { byUser = true } = {}) {
    const where = {};
    if (user.role === "USER") {
      if (!user.merchantId) throw new Error("No merchant associated");
      where.merchantId = user.merchantId;
      if (byUser) where.userId = user.id;
    } else if (merchantId) {
      where.merchantId = merchantId;
    }
    return where;
  }

  dateRange(where, field, startDate, endDate) {
    if (!startDate && !endDate) return;
    where[field] = {};
    if (startDate) where[field].gte = new Date(startDate);
    if (endDate) where[field].lte = new Date(endDate);
  }

  /**
   * allowed: properties valid for this model (anything else is ignored,
   * so a stray filter can never crash Prisma).
   * USER role can never override its own merchantId / userId scope.
   */
  applyFilters(where, filters, allowed, user, searchFn) {
    if (!Array.isArray(filters)) return;
    const isUser = user.role === "USER";

    for (const { property, operator, value } of filters) {
      if (!allowed.includes(property)) continue;
      if (isUser && (property === "merchantId" || property === "userId")) {
        continue;
      }

      switch (property) {
        case "gatewayId":
        case "merchantId":
        case "userId":
        case "payInRequestId":
          where[property] = Number(value);
          break;
        case "amount":
          if (operator === "gte") {
            where.amount = { ...where.amount, gte: parseFloat(value) };
          } else if (operator === "lte") {
            where.amount = { ...where.amount, lte: parseFloat(value) };
          }
          break;
        case "transactionId":
          where.transactionId =
            operator === "contains" ? { contains: value } : value;
          break;
        case "referenceId":
          where.referenceId = { contains: value, mode: "insensitive" };
          break;
        case "search":
          if (searchFn) Object.assign(where, searchFn(value));
          break;
        default: // status, paymentMode, feeType, type, approvalStatus
          where[property] = value;
      }
    }
  }

  async loadLookups() {
    const [merchants, gateways] = await Promise.all([
      prisma.merchant.findMany({
        select: { id: true, name: true, email: true },
      }),
      prisma.gateway.findMany({ select: { id: true, name: true } }),
    ]);
    return {
      merchants: new Map(merchants.map((m) => [m.id, m])),
      gateways: new Map(gateways.map((g) => [g.id, g])),
    };
  }

  // Keyset pagination: WHERE id > lastId ORDER BY id LIMIT n.
  // Same speed on page 1 and page 160, unlike skip/take.
  streamModel({ model, where, query, columns, filePath }) {
    return streamCsv({
      filePath,
      columns,
      fetchBatch: (lastId) =>
        prisma[model].findMany({
          where: { ...where, id: { gt: lastId } },
          orderBy: { id: "asc" },
          take: BATCH_SIZE,
          ...query,
        }),
    });
  }

  extractUtr(req) {
    let utr = "";
    try {
      if (req.metadata) {
        const metadata =
          typeof req.metadata === "string"
            ? JSON.parse(req.metadata)
            : req.metadata;

        if (metadata.responseLog) {
          const rl =
            typeof metadata.responseLog === "string"
              ? JSON.parse(metadata.responseLog)
              : metadata.responseLog;
          utr = rl?.data?.payment?.utr || rl?.data?.acquirer_data?.rrn || "";
        }
        if (!utr) {
          utr = metadata?.utr || metadata?.rrn || metadata?.bankReference || "";
        }
      }
      if (!utr && req.responseLog) {
        const rl =
          typeof req.responseLog === "string"
            ? JSON.parse(req.responseLog)
            : req.responseLog;
        utr = rl?.data?.payment?.utr || rl?.data?.acquirer_data?.rrn || "";
      }
    } catch (e) {
      utr = "";
    }
    return utr;
  }

  safeDecrypt(value) {
    if (!value) return "";
    try {
      return decrypt(value);
    } catch {
      return value;
    }
  }

  requestSearch(value) {
    return {
      OR: [
        { merchantReference: { contains: value, mode: "insensitive" } },
        { metadata: { path: ["utr"], string_contains: value } },
      ],
    };
  }

  walletSearch(value) {
    return { description: { contains: value, mode: "insensitive" } };
  }

  // ---------- PAYIN REQUESTS ----------

  async exportPayInRequests({
    user,
    merchantId,
    startDate,
    endDate,
    filters,
    filePath,
  }) {
    const where = this.scopeWhere(user, merchantId);
    this.dateRange(where, "requestedAt", startDate, endDate);
    this.applyFilters(
      where,
      filters,
      [
        "status",
        "paymentMode",
        "gatewayId",
        "merchantId",
        "userId",
        "amount",
        "search",
        "feeType",
      ],
      user,
      this.requestSearch,
    );
    const { merchants, gateways } = await this.loadLookups();

    const columns = [
      ["id", (r) => r.id],
      ["merchantId", (r) => r.merchantId],
      ["gatewayId", (r) => r.gatewayId],
      ["userId", (r) => r.userId],
      ["merchantName", (r) => merchants.get(r.merchantId)?.name],
      ["gatewayName", (r) => gateways.get(r.gatewayId)?.name],
      ["amount", (r) => money(r.amount)],
      ["status", (r) => r.status],
      ["merchantReference", (r) => r.merchantReference],
      ["gatewayReference", (r) => r.gatewayReference],
      ["customerName", (r) => r.customerName],
      ["customerEmail", (r) => r.customerEmail],
      ["customerPhone", (r) => r.customerPhone],
      ["paymentMode", (r) => r.paymentMode],
      ["feeAmount", (r) => money(r.feeAmount)],
      ["taxAmount", (r) => money(r.taxAmount)],
      ["amountToCredit", (r) => money(r.amountToCredit)],
      ["platformProfit", (r) => money(r.platformProfit)],
      ["merchantRate", (r) => money(r.merchantRate)],
      ["feeType", (r) => r.feeType],
      ["currency", (r) => r.currency],
      ["amountInINR", (r) => money(r.amountInINR)],
      ["failureReason", (r) => r.failureReason],
      ["utr", (r) => this.extractUtr(r)],
      ["requestedAt", (r) => formatIST(r.requestedAt)],
      ["completedAt", (r) => formatIST(r.completedAt)],
      ["createdAt", (r) => formatIST(r.createdAt)],
    ];

    return this.streamModel({
      model: "payInRequest",
      where,
      filePath,
      columns,
      query: {
        select: {
          id: true,
          merchantId: true,
          gatewayId: true,
          userId: true,
          amount: true,
          status: true,
          merchantReference: true,
          gatewayReference: true,
          customerName: true,
          customerEmail: true,
          customerPhone: true,
          paymentMode: true,
          feeType: true,
          feeAmount: true,
          taxAmount: true,
          amountToCredit: true,
          platformProfit: true,
          merchantRate: true,
          amountInINR: true,
          currency: true,
          failureReason: true,
          requestedAt: true,
          completedAt: true,
          createdAt: true,
          metadata: true,
          responseLog: true, // only used to extract UTR
        },
      },
    });
  }

  // ---------- PAYOUT REQUESTS ----------

  async exportPayOutRequests({
    user,
    merchantId,
    startDate,
    endDate,
    filters,
    filePath,
  }) {
    const where = this.scopeWhere(user, merchantId);
    this.dateRange(where, "requestedAt", startDate, endDate);
    this.applyFilters(
      where,
      filters,
      [
        "status",
        "paymentMode",
        "gatewayId",
        "merchantId",
        "userId",
        "amount",
        "search",
      ],
      user,
      this.requestSearch,
    );
    const { merchants, gateways } = await this.loadLookups();

    const columns = [
      ["id", (r) => r.id],
      ["merchantId", (r) => r.merchantId],
      ["merchantName", (r) => merchants.get(r.merchantId)?.name],
      ["gatewayName", (r) => gateways.get(r.gatewayId)?.name],
      ["amount", (r) => money(r.amount)],
      ["status", (r) => r.status],
      ["merchantReference", (r) => r.merchantReference],
      ["gatewayReference", (r) => r.gatewayReference],
      ["beneficiaryName", (r) => r.beneficiaryName],
      ["beneficiaryAccount", (r) => this.safeDecrypt(r.beneficiaryAccount)],
      ["beneficiaryBank", (r) => this.safeDecrypt(r.beneficiaryBank)],
      ["beneficiaryIfsc", (r) => this.safeDecrypt(r.beneficiaryIfsc)],
      ["feeAmount", (r) => money(r.feeAmount)],
      ["taxAmount", (r) => money(r.taxAmount)],
      ["amountToDebit", (r) => money(r.amountToDebit)],
      ["utr", (r) => this.extractUtr(r)],
      ["requestedAt", (r) => formatIST(r.requestedAt)],
      ["processedAt", (r) => formatIST(r.processedAt)],
      ["completedAt", (r) => formatIST(r.completedAt)],
      ["createdAt", (r) => formatIST(r.createdAt)],
    ];

    return this.streamModel({
      model: "payOutRequest",
      where,
      filePath,
      columns,
      query: {
        select: {
          id: true,
          merchantId: true,
          gatewayId: true,
          amount: true,
          status: true,
          merchantReference: true,
          gatewayReference: true,
          beneficiaryName: true,
          beneficiaryAccount: true,
          beneficiaryBank: true,
          beneficiaryIfsc: true,
          feeAmount: true,
          taxAmount: true,
          amountToDebit: true,
          requestedAt: true,
          processedAt: true,
          completedAt: true,
          createdAt: true,
          metadata: true,
          responseLog: true,
        },
      },
    });
  }

  // ---------- WALLETS (payin + payout share one builder) ----------

  async buildWalletExport(
    model,
    extraColumn,
    { user, merchantId, startDate, endDate, filters, filePath },
  ) {
    const where = this.scopeWhere(user, merchantId);
    this.dateRange(where, "transactionDate", startDate, endDate);
    this.applyFilters(
      where,
      filters,
      [
        "merchantId",
        "userId",
        "type",
        "transactionId",
        "referenceId",
        "search",
        "amount",
      ],
      user,
      this.walletSearch,
    );
    const { merchants } = await this.loadLookups();

    const columns = [
      ["id", (w) => w.id],
      ["merchantId", (w) => w.merchantId],
      ["merchantName", (w) => merchants.get(w.merchantId)?.name],
      ["merchantEmail", (w) => merchants.get(w.merchantId)?.email],
      ["amount", (w) => money(w.amount)],
      ["type", (w) => w.type],
      ["description", (w) => w.description],
      ["transactionId", (w) => w.transactionId],
      extraColumn,
      ["openingBalance", (w) => money(w.openingBalance)],
      ["closingBalance", (w) => money(w.closingBalance)],
      ["createdAt", (w) => formatIST(w.createdAt)],
    ];

    return this.streamModel({
      model,
      where,
      filePath,
      columns,
      query: {
        select: {
          id: true,
          merchantId: true,
          amount: true,
          type: true,
          description: true,
          transactionId: true,
          referenceId: true,
          transactionDate: true,
          openingBalance: true,
          closingBalance: true,
          createdAt: true,
        },
      },
    });
  }

  exportPayInWallets(opts) {
    return this.buildWalletExport(
      "payInWallet",
      ["referenceId", (w) => w.referenceId],
      opts,
    );
  }

  exportPayOutWallets(opts) {
    return this.buildWalletExport(
      "payOutWallet",
      ["transactionDate", (w) => formatIST(w.transactionDate)],
      opts,
    );
  }

  // ---------- SETTLEMENTS ----------

  async exportSettlements({ user, merchantId, filters, filePath }) {
    const where = this.scopeWhere(user, merchantId);
    this.applyFilters(
      where,
      filters,
      ["merchantId", "status", "approvalStatus", "amount"],
      user,
    );
    const { merchants } = await this.loadLookups();

    const columns = [
      ["id", (s) => s.id],
      ["merchantId", (s) => s.merchantId],
      ["merchantName", (s) => merchants.get(s.merchantId)?.name],
      ["merchantEmail", (s) => merchants.get(s.merchantId)?.email],
      ["amount", (s) => money(s.amount)],
      ["status", (s) => s.status],
      ["approvalStatus", (s) => s.approvalStatus],
      ["description", (s) => s.description],
      ["fee", (s) => money(s.fee)],
      ["sourceWalletBalanceBefore", (s) => money(s.sourceWalletBalanceBefore)],
      ["sourceWalletBalanceAfter", (s) => money(s.sourceWalletBalanceAfter)],
      [
        "destinationWalletBalanceBefore",
        (s) => money(s.destinationWalletBalanceBefore),
      ],
      [
        "destinationWalletBalanceAfter",
        (s) => money(s.destinationWalletBalanceAfter),
      ],
      ["requestedAt", (s) => formatIST(s.requestedAt)],
      ["approvedAt", (s) => formatIST(s.approvedAt)],
      ["processedAt", (s) => formatIST(s.processedAt)],
      ["completedAt", (s) => formatIST(s.completedAt)],
      ["createdAt", (s) => formatIST(s.createdAt)],
    ];

    return this.streamModel({
      model: "settlement",
      where,
      filePath,
      columns,
      query: {
        select: {
          id: true,
          merchantId: true,
          amount: true,
          status: true,
          approvalStatus: true,
          description: true,
          fee: true,
          sourceWalletBalanceBefore: true,
          sourceWalletBalanceAfter: true,
          destinationWalletBalanceBefore: true,
          destinationWalletBalanceAfter: true,
          requestedAt: true,
          approvedAt: true,
          processedAt: true,
          completedAt: true,
          createdAt: true,
        },
      },
    });
  }

  // ---------- CHARGEBACKS ----------

  async exportChargebacks({ user, merchantId, filters, filePath }) {
    const where = this.scopeWhere(user, merchantId, { byUser: false });
    this.applyFilters(
      where,
      filters,
      ["merchantId", "status", "payInRequestId", "amount"],
      user,
    );
    const { merchants, gateways } = await this.loadLookups();

    const columns = [
      ["id", (c) => c.id],
      ["merchantId", (c) => c.merchantId],
      ["merchantName", (c) => merchants.get(c.merchantId)?.name],
      ["gatewayName", (c) => gateways.get(c.gatewayId)?.name],
      ["payInRequestId", (c) => c.payInRequestId],
      ["payInMerchantReference", (c) => c.payInRequest?.merchantReference],
      ["amount", (c) => money(c.amount)],
      ["currency", (c) => c.currency],
      ["status", (c) => c.status],
      ["reason", (c) => c.reason],
      ["reasonDescription", (c) => c.reasonDescription],
      ["gatewayChargebackId", (c) => c.gatewayChargebackId],
      ["customerName", (c) => c.customerName],
      ["customerEmail", (c) => c.customerEmail],
      ["customerPhone", (c) => c.customerPhone],
      ["chargebackFee", (c) => money(c.chargebackFee)],
      ["merchantLiability", (c) => money(c.merchantLiability)],
      ["recoveredAmount", (c) => money(c.recoveredAmount)],
      ["initiatedAt", (c) => formatIST(c.initiatedAt)],
      ["respondedAt", (c) => formatIST(c.respondedAt)],
      ["resolvedAt", (c) => formatIST(c.resolvedAt)],
      ["createdAt", (c) => formatIST(c.createdAt)],
    ];

    return this.streamModel({
      model: "chargeback",
      where,
      filePath,
      columns,
      query: {
        select: {
          id: true,
          merchantId: true,
          gatewayId: true,
          payInRequestId: true,
          amount: true,
          currency: true,
          status: true,
          reason: true,
          reasonDescription: true,
          gatewayChargebackId: true,
          customerName: true,
          customerEmail: true,
          customerPhone: true,
          chargebackFee: true,
          merchantLiability: true,
          recoveredAmount: true,
          initiatedAt: true,
          respondedAt: true,
          resolvedAt: true,
          createdAt: true,
          payInRequest: { select: { merchantReference: true } },
        },
      },
    });
  }

  // ---------- REFUNDS ----------

  async exportRefunds({ user, merchantId, filters, filePath }) {
    const where = this.scopeWhere(user, merchantId, { byUser: false });
    this.applyFilters(
      where,
      filters,
      ["merchantId", "status", "payInRequestId", "amount"],
      user,
    );
    const { merchants, gateways } = await this.loadLookups();

    const columns = [
      ["id", (r) => r.id],
      ["merchantId", (r) => r.merchantId],
      ["merchantName", (r) => merchants.get(r.merchantId)?.name],
      ["gatewayName", (r) => gateways.get(r.gatewayId)?.name],
      ["payInRequestId", (r) => r.payInRequestId],
      ["payInMerchantReference", (r) => r.payInRequest?.merchantReference],
      ["amount", (r) => money(r.amount)],
      ["currency", (r) => r.currency],
      ["refundType", (r) => r.refundType],
      ["status", (r) => r.status],
      ["reason", (r) => r.reason],
      ["gatewayRefundId", (r) => r.gatewayRefundId],
      ["refundFee", (r) => money(r.refundFee)],
      ["adjustmentAmount", (r) => money(r.adjustmentAmount)],
      ["initiatedAt", (r) => formatIST(r.initiatedAt)],
      ["processedAt", (r) => formatIST(r.processedAt)],
      ["completedAt", (r) => formatIST(r.completedAt)],
      ["createdAt", (r) => formatIST(r.createdAt)],
    ];

    return this.streamModel({
      model: "refund",
      where,
      filePath,
      columns,
      query: {
        select: {
          id: true,
          merchantId: true,
          gatewayId: true,
          payInRequestId: true,
          amount: true,
          currency: true,
          refundType: true,
          status: true,
          reason: true,
          gatewayRefundId: true,
          refundFee: true,
          adjustmentAmount: true,
          initiatedAt: true,
          processedAt: true,
          completedAt: true,
          createdAt: true,
          payInRequest: { select: { merchantReference: true } },
        },
      },
    });
  }
}

module.exports = new CsvExportService();
