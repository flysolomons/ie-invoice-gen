import { SearchX } from "lucide-react";
import { StatusScreen } from "@/components/app/status-screen";

export default function NotFound() {
  return (
    <StatusScreen icon={SearchX} title="Page not found">
      That page doesn&rsquo;t exist, or the invoice, client or expense has been removed.
    </StatusScreen>
  );
}
