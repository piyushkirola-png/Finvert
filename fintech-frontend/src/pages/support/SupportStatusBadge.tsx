import type { SupportStatus } from "../../types/support";
import { BADGE, BADGE_COLORS } from "../../lib/styles";

export default function SupportStatusBadge({
  status,
}: {
  status: SupportStatus;
}) {
  const color = status === "OPEN" ? BADGE_COLORS.green : BADGE_COLORS.red;
  return (
    <span className={`${BADGE} ${color}`}>
      <span
        className={`w-1.5 h-1.5 rounded-full ${
          status === "OPEN" ? "bg-green-500" : "bg-red-500"
        }`}
      />
      {status === "OPEN" ? "Open" : "Closed"}
    </span>
  );
}