import { Paperclip } from "lucide-react";
import type { SupportMessage as Msg } from "../../types/support";

function formatTime(iso: string) {
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function fileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function SupportMessage({
  message,
  viewerId,
}: {
  message: Msg;
  viewerId: number;
}) {
  const isOwn = message.senderId === viewerId;
  return (
    <div className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[75%] rounded-lg px-4 py-2.5 ${
          isOwn ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-900"
        }`}
      >
        <div
          className={`text-xs mb-1 ${
            isOwn ? "text-slate-300" : "text-slate-500"
          }`}
        >
          {message.sender?.fullName ?? "Unknown"} · {formatTime(message.createdAt)}
        </div>
        <p className="text-sm whitespace-pre-wrap break-words">{message.body}</p>
        {message.attachments && message.attachments.length > 0 && (
          <ul className="mt-2 space-y-1">
            {message.attachments.map((a) => (
              <li key={a.id}>
                <a
                  href={a.fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className={`inline-flex items-center gap-1 text-xs underline ${
                    isOwn ? "text-slate-200" : "text-slate-700"
                  }`}
                >
                  <Paperclip size={12} />
                  {a.fileName} ({fileSize(a.fileSize)})
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}