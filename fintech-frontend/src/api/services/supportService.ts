import api from "../../lib/api-client";
import type {
  SupportListResponse,
  SupportTicket,
  SupportMessage,
  SupportMeta,
  SupportStatus,
  SupportTopic,
} from "../../types/support";

export async function getSupportMeta(): Promise<SupportMeta> {
  const { data } = await api.get("/support/meta");
  return data;
}

export async function listTickets(params: {
  status?: SupportStatus;
  topic?: SupportTopic;
  search?: string;
  page?: number;
  limit?: number;
}): Promise<SupportListResponse> {
  const { data } = await api.get("/support/tickets", { params });
  return data;
}

export async function getTicket(id: number): Promise<SupportTicket> {
  const { data } = await api.get(`/support/tickets/${id}`);
  return data;
}

export async function createTicket(
  payload: { topic: SupportTopic; subject: string; message: string },
  files?: File[],
): Promise<SupportTicket> {
  const form = new FormData();
  form.append("topic", payload.topic);
  form.append("subject", payload.subject);
  form.append("message", payload.message);
  if (files && files.length) {
    files.forEach((f) => form.append("attachments", f));
  }
  const { data } = await api.post("/support/tickets", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

export async function postMessage(
  ticketId: number,
  body: string,
  files?: File[],
): Promise<SupportMessage> {
  const form = new FormData();
  form.append("body", body);
  if (files && files.length) {
    files.forEach((f) => form.append("attachments", f));
  }
  const { data } = await api.post(`/support/tickets/${ticketId}/messages`, form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

export async function updateTicketStatus(
  ticketId: number,
  status: SupportStatus,
): Promise<SupportTicket> {
  const { data } = await api.patch(`/support/tickets/${ticketId}/status`, {
    status,
  });
  return data;
}