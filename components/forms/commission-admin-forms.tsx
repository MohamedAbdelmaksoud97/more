"use client";

import { useActionState } from "react";
import {
  resetMarketerCommissionsAction,
  resetMonthlyCommissionsAction,
  resetTargetAction,
  updateMarketerCommissionAction,
  upsertTargetAction,
} from "@/lib/actions/admin-actions";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/form";
import type { Target, UserProfile } from "@/lib/types";

type ActionState = { ok: boolean; message: string; errors?: Record<string, string[] | undefined> };

const initialState: ActionState = { ok: false, message: "" };

function StateMessage({ state }: { state: ActionState }) {
  if (!state.message) return null;
  return (
    <p className={`rounded-md p-3 text-sm font-bold ${state.ok ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
      {state.message}
    </p>
  );
}

export function CommissionSettingsForm({ marketers }: { marketers: UserProfile[] }) {
  const [state, action, pending] = useActionState(updateMarketerCommissionAction, initialState);

  return (
    <form action={action} className="grid gap-4 md:grid-cols-4">
      <Field label="المسوق" error={state.errors?.marketerId}>
        <Select name="marketerId" required>
          <option value="">اختر المسوق</option>
          {marketers.map((marketer) => (
            <option key={marketer.uid} value={marketer.uid}>
              {marketer.name}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="نوع العمولة" error={state.errors?.commissionType}>
        <Select name="commissionType" defaultValue="PERCENTAGE" required>
          <option value="PERCENTAGE">نسبة مئوية</option>
          <option value="FIXED">مبلغ ثابت</option>
        </Select>
      </Field>
      <Field label="قيمة العمولة" error={state.errors?.commissionValue}>
        <Input name="commissionValue" type="number" min={0} step="0.01" placeholder="مثال: 5 أو 150" required />
      </Field>
      <div className="grid content-end gap-3">
        <Button type="submit" loading={pending}>حفظ العمولة</Button>
      </div>
      <div className="md:col-span-4">
        <StateMessage state={state} />
      </div>
    </form>
  );
}

export function MonthlyCommissionResetForm() {
  const now = new Date();
  const [state, action, pending] = useActionState(resetMonthlyCommissionsAction, initialState);

  return (
    <form action={action} className="grid gap-4 md:grid-cols-3">
      <Field label="الشهر" error={state.errors?.month}>
        <Input name="month" type="number" min={1} max={12} defaultValue={now.getMonth() + 1} required />
      </Field>
      <Field label="السنة" error={state.errors?.year}>
        <Input name="year" type="number" min={2024} max={2100} defaultValue={now.getFullYear()} required />
      </Field>
      <div className="grid content-end gap-3">
        <Button type="submit" variant="danger" loading={pending}>تصفير عمولات الشهر</Button>
      </div>
      <div className="md:col-span-3">
        <StateMessage state={state} />
      </div>
    </form>
  );
}

export function MarketerCommissionResetForm({ marketers }: { marketers: UserProfile[] }) {
  const [state, action, pending] = useActionState(resetMarketerCommissionsAction, initialState);

  return (
    <form action={action} className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto]">
      <Field label="المسوق" error={state.errors?.marketerId}>
        <Select name="marketerId" required>
          <option value="">اختر المسوق</option>
          {marketers.map((marketer) => (
            <option key={marketer.uid} value={marketer.uid}>
              {marketer.name}
            </option>
          ))}
        </Select>
      </Field>
      <div className="grid content-end gap-3">
        <Button type="submit" variant="danger" loading={pending}>
          تصفير عمولة المسوق
        </Button>
      </div>
      <div className="md:col-span-2">
        <StateMessage state={state} />
      </div>
    </form>
  );
}

export function TargetAdminForm({ marketers }: { marketers: UserProfile[] }) {
  const now = new Date();
  const [state, action, pending] = useActionState(upsertTargetAction, initialState);

  return (
    <form action={action} className="grid gap-4 md:grid-cols-5">
      <Field label="المسوق" error={state.errors?.marketerId}>
        <Select name="marketerId" required>
          <option value="">اختر المسوق</option>
          {marketers.map((marketer) => (
            <option key={marketer.uid} value={marketer.uid}>
              {marketer.name}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="الشهر" error={state.errors?.month}>
        <Input name="month" type="number" min={1} max={12} defaultValue={now.getMonth() + 1} required />
      </Field>
      <Field label="السنة" error={state.errors?.year}>
        <Input name="year" type="number" min={2024} max={2100} defaultValue={now.getFullYear()} required />
      </Field>
      <Field label="قيمة التارجت" error={state.errors?.targetAmount}>
        <Input name="targetAmount" type="number" min={0} step="0.01" required />
      </Field>
      <div className="grid content-end gap-3">
        <Button type="submit" loading={pending}>حفظ التارجت</Button>
      </div>
      <div className="md:col-span-5">
        <StateMessage state={state} />
      </div>
    </form>
  );
}

export function ResetTargetButton({ target }: { target: Target }) {
  const [state, action, pending] = useActionState(resetTargetAction, initialState);

  return (
    <form action={action} className="grid gap-2">
      <input type="hidden" name="targetId" value={target.id} />
      <Button type="submit" variant="secondary" loading={pending} className="h-9 text-xs">
        تصفير التارجت
      </Button>
      <StateMessage state={state} />
    </form>
  );
}
