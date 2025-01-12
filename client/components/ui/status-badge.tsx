import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle, RefreshCcw } from "lucide-react";

interface StatusBadgeProps {
  step: string;
}

export const StatusBadge = ({ step }: StatusBadgeProps) => {
  const getStatusConfig = () => {
    switch (step) {
      case "Completed":
        return {
          variant: "success" as const,
          icon: CheckCircle,
          className: "bg-green-500/10 text-green-500",
        };
      case "Not Started":
        return {
          variant: "secondary" as const,
          icon: AlertCircle,
          className: "bg-gray-500/10 text-gray-500",
        };
      default:
        return {
          variant: "default" as const,
          icon: RefreshCcw,
          className: "bg-blue-500/10 text-blue-500",
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  return (
    <Badge  variant={config.variant} className={config.className}>
      <Icon className="w-3 h-3 mr-1" />
      {step}
    </Badge>
  );
};
export default StatusBadge;
