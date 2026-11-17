import { useMemo, useState } from "react";
import { Plus, RefreshCw } from "lucide-react";
import { useSupportTickets, useSupportTicket } from "../../api/queries/useSupport";
import type { SupportStatus } from "../../types/support";
import { PAGE_HEADER, BTN_PRIMARY, BTN_REFRESH } from "../../lib/styles";
import SupportSidebar from "./SupportSidebar";
import SupportChat from "./SupportChat";
import SupportNewTicketDialog from "./SupportNewTicketDialog";
import SupportStatusBadge from "./SupportStatusBadge";

export default function Support({ isAdmin }: { isAdmin: boolean }) {
  const [activeId, setActiveId] = useState<number | undefined>(undefined);
  const [statusFilter, setStatusFilter] = useState<SupportStatus | "">("");
  const [showCreate, setShowCreate] = useState(false);

  const list = useSupportTickets({
    status: statusFilter || undefined,
    page: 1,
    limit: 50,
  });
  const detail = useSupportTicket(activeId);

  const tickets = list.data?.tickets ?? [];

  const filtered = useMemo(() => {
    if (!statusFilter) return tickets;
    return tickets.filter((t) => t.status === statusFilter);
  }, [tickets, statusFilter]);

  return (
    <div className="space-y-4">
      <div className={PAGE_HEADER}>
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Support</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {isAdmin
              ? "View and respond to user tickets"
              : "Raise and track your support tickets"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => list.refetch()}
            className={BTN_REFRESH}
            disabled={list.isFetching}
          >
            <RefreshCw size={16} /> Refresh
          </button>
          {!isAdmin && (
            <button
              onClick={() => setShowCreate(true)}
              className={BTN_PRIMARY}
            >
              <Plus size={16} /> New Ticket
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        {(["", "OPEN", "CLOSED"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`inline-flex items-center gap-1 h-8 px-3 rounded-md text-xs font-medium border transition ${
              statusFilter === s
                ? "bg-slate-900 text-white border-slate-900"
                : "bg-white text-slate-700 border-slate-300 hover:bg-[#f5efe0]"
            }`}
          >
            {s === "" ? "All" : <SupportStatusBadge status={s} />}
          </button>
        ))}
      </div>

      <div className="flex gap-4 h-[calc(100vh-260px)] min-h-[460px]">
        <SupportSidebar
          tickets={filtered}
          activeId={activeId}
          onSelect={setActiveId}
          loading={list.isLoading}
        />
        <SupportChat
          ticket={detail.data}
          isAdmin={isAdmin}
          loading={detail.isLoading}
        />
      </div>

      {showCreate && (
        <SupportNewTicketDialog
          onClose={() => setShowCreate(false)}
          onCreated={(id) => setActiveId(id)}
        />
      )}
    </div>
  );
}