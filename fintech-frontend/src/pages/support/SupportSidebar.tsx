import { MessageSquare } from "lucide-react";
import type { SupportTicket } from "../../types/support";
import SupportStatusBadge from "./SupportStatusBadge";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function SupportSidebar({
  tickets,
  activeId,
  onSelect,
  loading,
}: {
  tickets: SupportTicket[];
  activeId?: number;
  onSelect: (id: number) => void;
  loading?: boolean;
}) {
  return (
    <aside className="w-72 flex-shrink-0 bg-white border border-slate-200 rounded-lg flex flex-col overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-200 flex items-center gap-2">
        <MessageSquare size={16} className="text-slate-700" />
        <h2 className="text-sm font-semibold text-slate-900">
          Support Tickets
        </h2>
      </div>
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <p className="text-xs text-slate-500 p-4">Loading…</p>
        ) : tickets.length === 0 ? (
          <p className="text-xs text-slate-500 p-4">No tickets yet.</p>
        ) : (
          <ul>
            {tickets.map((t) => (
              <li key={t.id}>
                <button
                  onClick={() => onSelect(t.id)}
                  className={`w-full text-left px-4 py-3 border-b border-slate-100 hover:bg-[#f5efe0] transition ${
                    activeId === t.id ? "bg-[#f5efe0]" : ""
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-slate-900 truncate">
                      {t.subject}
                    </span>
                    <SupportStatusBadge status={t.status} />
                  </div>
                  <div className="mt-1 flex items-center justify-between text-xs text-slate-500">
                    <span className="truncate">
                      {t.user?.fullName ?? `User #${t.userId}`}
                    </span>
                    <span>{formatDate(t.updatedAt)}</span>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
}
