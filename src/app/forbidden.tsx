import { Lock } from "lucide-react";
import { StatusScreen } from "@/components/app/status-screen";

export default function Forbidden() {
  return (
    <StatusScreen icon={Lock} title="Owner access required">
      Only an owner can do this. Ask an owner on your team to make the change.
    </StatusScreen>
  );
}
