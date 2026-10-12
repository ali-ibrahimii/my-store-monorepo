import { Badge } from "@my-store/ui-kit/components/badge";
import { INVOICE_STATUS_LABELS } from "@my-store/shared-utils";

const STATUS_VARIANTS: Record<
  string,
  "default" | "secondary" | "destructive" | "outline" | "success" | "warning"
> = {
  PAID: "success",
  ISSUED: "warning",
  PARTIAL: "warning",
  DRAFT: "secondary",
  CANCELLED: "destructive",
};

/** وضعیت فاکتور با Badge شادcn. */
export function InvoiceStatusBadge({ status }: { status: string }) {
  return (
    <Badge variant={STATUS_VARIANTS[status] ?? "outline"}>
      {INVOICE_STATUS_LABELS[status] ?? status}
    </Badge>
  );
}
