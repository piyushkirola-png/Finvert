import { useQuery } from "@tanstack/react-query";
import {
  getSupportMeta,
  listTickets,
  getTicket,
} from "../services/supportService";
import type { SupportStatus, SupportTopic } from "../../types/support";

export const useSupportMeta = () =>
  useQuery({
    queryKey: ["support-meta"],
    queryFn: getSupportMeta,
    staleTime: Infinity,
  });

export const useSupportTickets = (params: {
  status?: SupportStatus;
  topic?: SupportTopic;
  search?: string;
  page?: number;
  limit?: number;
}) =>
  useQuery({
    queryKey: ["support-tickets", params],
    queryFn: () => listTickets(params),
  });

export const useSupportTicket = (id?: number) =>
  useQuery({
    queryKey: ["support-ticket", id],
    queryFn: () => getTicket(id!),
    enabled: !!id,
  });
