import { useState } from "react";
import {
  MODAL_SHELL,
  MODAL_HEADER,
  MODAL_BODY,
  MODAL_FOOTER,
  INPUT,
  LABEL,
  BTN_PRIMARY,
} from "../../lib/styles";
import { useSupportMeta } from "../../api/queries/useSupport";
import { useCreateTicket } from "../../api/mutations/supportMutations";
import { TOPIC_LABELS } from "../../types/support";
import type { SupportTopic } from "../../types/support";

const CANCEL_BTN =
  "h-9 px-3 rounded-md border border-slate-300 bg-white text-slate-700 text-sm font-medium hover:bg-[#f5efe0] transition disabled:opacity-50";

export default function SupportNewTicketDialog({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (id: number) => void;
}) {
  const { data: meta } = useSupportMeta();
  const create = useCreateTicket();
  const [topic, setTopic] = useState<SupportTopic | "">("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

  const submit = () => {
    if (!topic || !subject.trim() || !message.trim()) return;
    create.mutate(
      { topic, subject: subject.trim(), message: message.trim() },
      {
        onSuccess: (t) => {
          onCreated(t.id);
          onClose();
        },
      },
    );
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className={`${MODAL_SHELL} max-w-lg`}>
        <div className={MODAL_HEADER}>
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                Create New Support Ticket
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Please provide details about your issue. We'll respond as soon
                as possible.
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-slate-500 hover:text-slate-900"
            ></button>
          </div>
        </div>

        <div className={`${MODAL_BODY} space-y-4`}>
          <div>
            <label className={LABEL}>Topic</label>
            <select
              className={INPUT}
              value={topic}
              onChange={(e) => setTopic(e.target.value as SupportTopic)}
            >
              <option value="">Select a topic</option>
              {(meta?.topics ?? []).map((t) => (
                <option key={t} value={t}>
                  {TOPIC_LABELS[t]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={LABEL}>Subject</label>
            <input
              className={INPUT}
              value={subject}
              maxLength={200}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Enter the subject of your issue"
            />
          </div>

          <div>
            <label className={LABEL}>Message</label>
            <textarea
              className="w-full min-h-[110px] px-2.5 py-2 rounded-md border border-slate-300 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#e6ddc9] focus:border-[#d4c9a8]"
              value={message}
              maxLength={5000}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Provide detailed information about your issue..."
            />
          </div>
        </div>

        <div className={MODAL_FOOTER}>
          <button
            onClick={onClose}
            className={CANCEL_BTN}
            disabled={create.isPending}
          >
            Cancel
          </button>
          <button
            onClick={submit}
            className={BTN_PRIMARY}
            disabled={
              create.isPending || !topic || !subject.trim() || !message.trim()
            }
          >
            {create.isPending ? "Creating…" : "Create Ticket"}
          </button>
        </div>
      </div>
    </div>
  );
}
