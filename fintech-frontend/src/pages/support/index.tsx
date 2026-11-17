import { useAuth } from "../../components/context/AuthContext";
import Support from "./Support";

export default function SupportPage() {
  const { role } = useAuth();
  const isAdmin = role === "ADMIN";
  return <Support isAdmin={isAdmin} />;
}