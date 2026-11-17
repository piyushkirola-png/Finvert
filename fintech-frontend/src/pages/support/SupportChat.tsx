import { useEffect, useRef, useState } from "react";
import type { SupportTicket } from "../../types/support";
import SupportStatusBadge from "./SupportStatusBadge";
import SupportMessage from "./SupportMessage";
import SupportReplyBox from "./SupportReplyBox";
import { usePostMessage } from "../../api/mutations/supportMutations";
import { useUpdateTicketStatus } from "../../api/mutations/supportMutations";
import { useAuth } from "../../components/context/AuthContext";
import { MODAL_SHELL, MODAL_BODY, MODAL_FOOTER } from "../../lib/styles";

const CANCEL_BTN =
  "h-9 px-3 rounded-md border border-slate-300 bg-white text-slate-700 text-sm font-medium hover:bg-[#f5efe0] transition disabled:opacity-50";

export default function SupportChat({
  ticket,
  isAdmin,
  loading,
}: {
  ticket?: SupportTicket;
  isAdmin: boolean;
  loading?: boolean;
}) {
  const { user } = useAuth();
  const scrollRef = useRef<HTMLDivElement>(null);
  const postMessage = usePostMessage(ticket?.id ?? 0);
  const updateStatus = useUpdateTicketStatus(ticket?.id ?? 0);
  const [confirmAction, setConfirmAction] = useState<"CLOSE" | "REOPEN" | null>(
    null,
  );

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [ticket?.messages]);

  if (!ticket) {
    return (
      <section className="flex-1 bg-white border border-slate-200 rounded-lg flex items-center justify-center text-sm text-slate-500">
        {loading ? "Loading…" : "Select a ticket to view the conversation"}
      </section>
    );
  }

  const closed = ticket.status === "CLOSED";

  const handleConfirm = () => {
    if (!confirmAction) return;
    updateStatus.mutate(confirmAction === "CLOSE" ? "CLOSED" : "OPEN", {
      onSuccess: () => setConfirmAction(null),
    });
  };

  return (
    <>
      <section className="flex-1 bg-white border border-slate-200 rounded-lg flex flex-col overflow-hidden">
        <header className="px-4 py-3 border-b border-slate-200 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              {ticket.subject}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {ticket.ticketNumber} · {ticket.user?.fullName ?? "—"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <SupportStatusBadge status={ticket.status} />
            {isAdmin && (
              <button
                onClick={() => setConfirmAction(closed ? "REOPEN" : "CLOSE")}
                disabled={updateStatus.isPending}
                className={`h-9 px-3 rounded-md text-white text-sm font-medium transition disabled:opacity-50 ${
                  closed
                    ? "bg-green-600 hover:bg-green-700"
                    : "bg-red-600 hover:bg-red-700"
                }`}
              >
                {closed ? "Reopen Ticket" : "Close Ticket"}
              </button>
            )}
          </div>
        </header>

        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-slate-50"
        >
          {ticket.messages?.map((m) => (
            <SupportMessage
              key={m.id}
              message={m}
              viewerId={Number(user?.id ?? 0)}
            />
          ))}
        </div>

        <SupportReplyBox
          disabled={closed}
          disabledReason={
            closed
              ? "This ticket is closed. An admin must reopen it before replying."
              : undefined
          }
          sending={postMessage.isPending}
          onSubmit={(body, files) => postMessage.mutate({ body, files })}
        />
      </section>

      {confirmAction && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className={`${MODAL_SHELL} max-w-sm`}>
            <div className={MODAL_BODY}>
              <div className="text-center">
                <h3 className="text-base font-semibold text-slate-900">
                  {confirmAction === "CLOSE" ? "Close Ticket" : "Reopen Ticket"}
                </h3>
                <p className="text-sm text-slate-600 mt-2">
                  {confirmAction === "CLOSE"
                    ? "Are you sure you want to close this ticket? This action can be reversed later."
                    : "Are you sure you want to reopen this ticket? It will become active and accept new replies."}
                </p>
              </div>
            </div>
            <div className={MODAL_FOOTER}>
              <button
                onClick={() => setConfirmAction(null)}
                className={CANCEL_BTN}
                disabled={updateStatus.isPending}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                disabled={updateStatus.isPending}
                className={`h-9 px-3 rounded-md text-white text-sm font-medium transition disabled:opacity-50 ${
                  confirmAction === "CLOSE"
                    ? "bg-red-600 hover:bg-red-700"
                    : "bg-green-600 hover:bg-green-700"
                }`}
              >
                {updateStatus.isPending
                  ? "Please wait…"
                  : confirmAction === "CLOSE"
                    ? "Close Ticket"
                    : "Reopen Ticket"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
