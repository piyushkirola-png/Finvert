import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  createTicket,
  postMessage,
  updateTicketStatus,
} from "../services/supportService";
import type {
  CreateTicketPayload,
  SupportStatus,
} from "../../types/support";

export const useCreateTicket = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateTicketPayload) =>
      createTicket(
        {
          topic: payload.topic,
          subject: payload.subject,
          message: payload.message,
        },
        payload.files,
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["support-tickets"] });
      toast.success("Ticket created");
    },
    onError: (e: any) => {
      toast.error(e.response?.data?.message || "Failed to create ticket");
    },
  });
};

export const usePostMessage = (ticketId: number) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ body, files }: { body: string; files?: File[] }) =>
      postMessage(ticketId, body, files),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["support-ticket", ticketId] });
      qc.invalidateQueries({ queryKey: ["support-tickets"] });
    },
    onError: (e: any) => {
      toast.error(e.response?.data?.message || "Failed to send reply");
    },
  });
};

export const useUpdateTicketStatus = (ticketId: number) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (status: SupportStatus) => updateTicketStatus(ticketId, status),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["support-ticket", ticketId] });
      qc.invalidateQueries({ queryKey: ["support-tickets"] });
      toast.success(
        data.status === "CLOSED" ? "Ticket closed" : "Ticket reopened",
      );
    },
    onError: (e: any) => {
      toast.error(e.response?.data?.message || "Failed to update status");
    },
  });
};