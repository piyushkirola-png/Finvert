import { useState, useRef } from "react";
import { Paperclip, Send } from "lucide-react";
import { BTN_PRIMARY } from "../../lib/styles";

export default function SupportReplyBox({
  disabled,
  disabledReason,
  onSubmit,
  sending,
}: {
  disabled?: boolean;
  disabledReason?: string;
  onSubmit: (body: string, files: File[]) => void;
  sending?: boolean;
}) {
  const [body, setBody] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(e.target.files ?? []);
    setFiles((prev) => [...prev, ...picked].slice(0, 5));
    if (fileRef.current) fileRef.current.value = "";
  };

  const removeFile = (idx: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const submit = () => {
    if (!body.trim()) return;
    onSubmit(body.trim(), files);
    setBody("");
    setFiles([]);
  };

  return (
    <div className="border-t border-slate-200 bg-white p-3 space-y-2">
      {disabled && disabledReason && (
        <p className="text-xs text-red-600">{disabledReason}</p>
      )}
      <textarea
        className="w-full min-h-[70px] px-3 py-2 rounded-md border border-slate-300 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#e6ddc9] focus:border-[#d4c9a8]"
        placeholder="Type your reply..."
        value={body}
        onChange={(e) => setBody(e.target.value)}
        disabled={disabled}
      />
      {files.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {files.map((f, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1 text-xs bg-slate-100 border border-slate-200 rounded px-2 py-1"
            >
              {f.name}
              <button
                onClick={() => removeFile(i)}
                className="text-slate-500 hover:text-red-600"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <input
            ref={fileRef}
            type="file"
            multiple
            className="hidden"
            onChange={handleFiles}
            disabled={disabled}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={disabled}
            className="inline-flex items-center gap-1 text-xs text-slate-600 hover:text-slate-900 disabled:opacity-50"
          >
            <Paperclip size={14} /> Attach Files (Max 5)
          </button>
        </div>
        <button
          onClick={submit}
          disabled={disabled || sending || !body.trim()}
          className={BTN_PRIMARY}
        >
          <Send size={14} /> {sending ? "Sending…" : "Send Reply"}
        </button>
      </div>
    </div>
  );
}