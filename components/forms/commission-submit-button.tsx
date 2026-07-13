"use client";

import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";

export function CommissionSubmitButton({
  children,
  variant = "primary",
}: {
  children: string;
  variant?: "primary" | "success" | "secondary";
}) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" variant={variant} loading={pending} className="h-9 min-w-28 text-xs">
      {children}
    </Button>
  );
}
