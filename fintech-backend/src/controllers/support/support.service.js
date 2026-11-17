const prisma = require("../../../config/prisma");

const TOPICS = [
  "PAYMENT_ISSUE",
  "ACCOUNT_RELATED",
  "TECHNICAL_SUPPORT",
  "FEATURE_REQUEST",
  "OTHER",
];
const STATUSES = ["OPEN", "CLOSED"];
const ADMIN_ROLES = new Set(["ADMIN"]);

function generateTicketNumber() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  const yyyy = now.getFullYear();
  const mm = pad(now.getMonth() + 1);
  const dd = pad(now.getDate());
  const hh = pad(now.getHours());
  const mi = pad(now.getMinutes());
  const ss = pad(now.getSeconds());
  return `TICKET-${yyyy}${mm}${dd}-${hh}${mi}${ss}`;
}

function isAdmin(user) {
  return ADMIN_ROLES.has(user.role);
}

async function createTicket(user, { topic, subject, message, files = [] }) {
  if (!TOPICS.includes(topic)) {
    throw Object.assign(new Error("Invalid topic"), { status: 400 });
  }
  if (!subject || subject.length < 3) {
    throw Object.assign(new Error("Subject too short"), { status: 400 });
  }
  if (!message || message.length < 1) {
    throw Object.assign(new Error("Message required"), { status: 400 });
  }

  let ticketNumber = generateTicketNumber();
  let ticket;
  let attempts = 0;
  while (!ticket && attempts < 3) {
    try {
      ticket = await prisma.$transaction(async (tx) => {
        const created = await tx.supportTicket.create({
          data: {
            ticketNumber,
            userId: user.id,
            merchantId: user.merchantId || null,
            topic,
            subject,
            status: "OPEN",
          },
        });
        const msg = await tx.supportMessage.create({
          data: {
            ticketId: created.id,
            senderId: user.id,
            senderRole: user.role,
            body: message,
          },
        });
        if (files && files.length) {
          await tx.supportAttachment.createMany({
            data: files.map((f) => ({
              messageId: msg.id,
              fileName: f.originalname,
              fileUrl: `/uploads/support/${f.filename}`,
              fileSize: f.size,
              mimeType: f.mimetype,
            })),
          });
        }
        return created;
      });
    } catch (e) {
      if (e.code === "P2002") {
        attempts += 1;
        await new Promise((r) => setTimeout(r, 1000));
        ticketNumber = generateTicketNumber();
        continue;
      }
      throw e;
    }
  }
  if (!ticket) throw new Error("Could not generate unique ticket number");
  return getTicket(user, ticket.id);
}

async function listTickets(
  user,
  { status, topic, search, page = 1, limit = 20 } = {},
) {
  const where = {};
  if (!isAdmin(user)) where.userId = user.id;
  if (status && STATUSES.includes(status)) where.status = status;
  if (topic && TOPICS.includes(topic)) where.topic = topic;
  if (search) {
    where.OR = [
      { subject: { contains: search, mode: "insensitive" } },
      { ticketNumber: { contains: search, mode: "insensitive" } },
    ];
  }

  const take = Math.min(parseInt(limit) || 20, 100);
  const skip = (Math.max(parseInt(page) || 1, 1) - 1) * take;

  const [total, tickets] = await Promise.all([
    prisma.supportTicket.count({ where }),
    prisma.supportTicket.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip,
      take,
      include: {
        user: { select: { id: true, email: true, fullName: true, role: true } },
        _count: { select: { messages: true } },
      },
    }),
  ]);
  return { total, page: Math.floor(skip / take) + 1, limit: take, tickets };
}

async function getTicket(user, id) {
  const ticket = await prisma.supportTicket.findUnique({
    where: { id: parseInt(id) },
    include: {
      user: { select: { id: true, email: true, fullName: true, role: true } },
      messages: {
        orderBy: { createdAt: "asc" },
        include: {
          sender: { select: { id: true, fullName: true, role: true } },
          attachments: true,
        },
      },
    },
  });
  if (!ticket)
    throw Object.assign(new Error("Ticket not found"), { status: 404 });
  if (!isAdmin(user) && ticket.userId !== user.id) {
    throw Object.assign(new Error("Forbidden"), { status: 403 });
  }
  return ticket;
}

async function postMessage(user, ticketId, body, files = []) {
  if (!body || body.length < 1) {
    throw Object.assign(new Error("Message required"), { status: 400 });
  }
  const ticket = await prisma.supportTicket.findUnique({
    where: { id: parseInt(ticketId) },
  });
  if (!ticket)
    throw Object.assign(new Error("Ticket not found"), { status: 404 });
  if (!isAdmin(user) && ticket.userId !== user.id) {
    throw Object.assign(new Error("Forbidden"), { status: 403 });
  }
  if (ticket.status === "CLOSED") {
    throw Object.assign(new Error("Ticket is closed. Ask admin to reopen."), {
      status: 400,
    });
  }

  const message = await prisma.$transaction(async (tx) => {
    const created = await tx.supportMessage.create({
      data: {
        ticketId: ticket.id,
        senderId: user.id,
        senderRole: user.role,
        body,
      },
    });
    if (files && files.length) {
      await tx.supportAttachment.createMany({
        data: files.map((f) => ({
          messageId: created.id,
          fileName: f.originalname,
          fileUrl: `/uploads/support/${f.filename}`,
          fileSize: f.size,
          mimeType: f.mimetype,
        })),
      });
    }
    await tx.supportTicket.update({
      where: { id: ticket.id },
      data: { updatedAt: new Date() },
    });
    return created;
  });

  return prisma.supportMessage.findUnique({
    where: { id: message.id },
    include: {
      sender: { select: { id: true, fullName: true, role: true } },
      attachments: true,
    },
  });
}

async function updateStatus(user, ticketId, status) {
  if (!isAdmin(user)) {
    throw Object.assign(new Error("Forbidden"), { status: 403 });
  }
  if (!STATUSES.includes(status)) {
    throw Object.assign(new Error("Invalid status"), { status: 400 });
  }
  const ticket = await prisma.supportTicket.findUnique({
    where: { id: parseInt(ticketId) },
  });
  if (!ticket)
    throw Object.assign(new Error("Ticket not found"), { status: 404 });
  if (ticket.status === status) return ticket;

  const data = { status };
  if (status === "CLOSED") {
    data.closedById = user.id;
    data.closedAt = new Date();
  } else {
    data.reopenedById = user.id;
    data.reopenedAt = new Date();
    data.closedById = null;
    data.closedAt = null;
  }
  return prisma.supportTicket.update({ where: { id: ticket.id }, data });
}

function meta() {
  return { topics: TOPICS, statuses: STATUSES };
}

module.exports = {
  createTicket,
  listTickets,
  getTicket,
  postMessage,
  updateStatus,
  meta,
  TOPICS,
  STATUSES,
};
