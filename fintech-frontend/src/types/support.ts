export type SupportTopic =
  | "PAYMENT_ISSUE"
  | "ACCOUNT_RELATED"
  | "TECHNICAL_SUPPORT"
  | "FEATURE_REQUEST"
  | "OTHER";

export type SupportStatus = "OPEN" | "CLOSED";

export interface SupportAttachment {
  id: number;
  messageId: number;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  createdAt: string;
}

export interface SupportMessage {
  id: number;
  ticketId: number;
  senderId: number;
  senderRole: string;
  body: string;
  createdAt: string;
  sender?: {
    id: number;
    fullName: string;
    role: string;
  };
  attachments?: SupportAttachment[];
}

export interface SupportTicket {
  id: number;
  ticketNumber: string;
  userId: number;
  merchantId: number | null;
  topic: SupportTopic;
  subject: string;
  status: SupportStatus;
  closedById: number | null;
  closedAt: string | null;
  reopenedById: number | null;
  reopenedAt: string | null;
  createdAt: string;
  updatedAt: string;
  user?: {
    id: number;
    email: string;
    fullName: string;
    role: string;
  };
  messages?: SupportMessage[];
  _count?: { messages: number };
}

export interface SupportListResponse {
  total: number;
  page: number;
  limit: number;
  tickets: SupportTicket[];
}

export interface SupportMeta {
  topics: SupportTopic[];
  statuses: SupportStatus[];
}

export interface CreateTicketPayload {
  topic: SupportTopic;
  subject: string;
  message: string;
  files?: File[];
}

export const TOPIC_LABELS: Record<SupportTopic, string> = {
  PAYMENT_ISSUE: "Payment Issues",
  ACCOUNT_RELATED: "Account Related",
  TECHNICAL_SUPPORT: "Technical Support",
  FEATURE_REQUEST: "Feature Request",
  OTHER: "Other",
};
