import { useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CircleAlert, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useAuth } from "@/features/auth/auth.context";
import { AdminTableError, createAdminTable, getTableError, updateAdminTable } from "./admin-table.service";
import { tableSchema, type TableFormInput, type TableFormValues } from "./admin-table.schema";
import type { AdminTable } from "./admin-table.types";

export type TableFormMode = "create" | "edit";
type TableFormProps = ({ mode: "create"; table?: never } | { mode: "edit"; table: AdminTable }) & {
  onSaved: (table: AdminTable) => void;
  onCancel: () => void;
  onBusyChange: (busy: boolean) => void;
  onAuthorizationError: (error: unknown) => boolean;
};

export function TableForm({ mode, table, onSaved, onCancel, onBusyChange, onAuthorizationError }: TableFormProps) {
  const { accessToken } = useAuth();
  const controller = useRef<AbortController | null>(null);
  const submitting = useRef(false);
  const form = useForm<TableFormInput, unknown, TableFormValues>({
    resolver: zodResolver(tableSchema),
    defaultValues: { tableNumber: table?.tableNumber ?? "", capacity: table?.capacity ?? "", location: table?.location ?? "", isActive: table?.isActive ?? true },
    mode: "onTouched",
  });
  const busy = form.formState.isSubmitting;
  const serverError = form.formState.errors.root?.server?.message;
  useEffect(() => () => controller.current?.abort(), []);

  async function onSubmit(values: TableFormValues) {
    if (submitting.current) return;
    submitting.current = true;
    form.clearErrors("root");
    onBusyChange(true);
    const request = new AbortController();
    controller.current = request;
    try {
      // An empty string clears an existing location with this API.
      const saved = mode === "create"
        ? await createAdminTable(accessToken ?? "", values, request.signal)
        : await updateAdminTable(accessToken ?? "", table.id, values, request.signal);
      if (!request.signal.aborted) onSaved(saved);
    } catch (error) {
      if (request.signal.aborted || onAuthorizationError(error)) return;
      if (error instanceof AdminTableError && error.status === 409) {
        form.setError("tableNumber", { message: getTableError(error) });
        requestAnimationFrame(() => form.setFocus("tableNumber"));
      } else form.setError("root.server", { message: getTableError(error) });
    } finally {
      submitting.current = false;
      onBusyChange(false);
    }
  }

  return <Form {...form}>
    <form onSubmit={(event) => { void form.handleSubmit(onSubmit)(event); }} noValidate aria-label={mode === "create" ? "Add table" : "Edit table"} aria-busy={busy}>
      {serverError && <div className="admin-feedback is-error" role="alert"><CircleAlert aria-hidden="true" /><p>{serverError}</p></div>}
      <fieldset disabled={busy} className="admin-form-grid">
        <legend className="sr-only">Table details</legend>
        <FormField control={form.control} name="tableNumber" render={({ field }) => <FormItem>
          <FormLabel>Table Number <span className="text-red-600" aria-hidden="true">*</span></FormLabel>
          <FormControl><Input {...field} className="admin-form-input" placeholder="e.g. T-09" required maxLength={10} autoComplete="off" /></FormControl>
          <FormMessage />
        </FormItem>} />
        <FormField control={form.control} name="capacity" render={({ field }) => <FormItem>
          <FormLabel>Capacity <span className="text-red-600" aria-hidden="true">*</span></FormLabel>
          <FormControl><Input {...field} className="admin-form-input" placeholder="e.g. 4" type="number" inputMode="numeric" min={1} max={2147483647} step={1} required /></FormControl>
          <FormMessage />
        </FormItem>} />
        <FormField control={form.control} name="location" render={({ field }) => <FormItem>
          <FormLabel>Location <span className="font-normal text-muted-foreground">(Optional)</span></FormLabel>
          <FormControl><Input {...field} className="admin-form-input" placeholder="e.g. Main Room, Outdoor, Private" maxLength={100} autoComplete="off" /></FormControl>
          <FormMessage />
        </FormItem>} />
        <FormField control={form.control} name="isActive" render={({ field }) => <FormItem>
          <FormLabel>Active</FormLabel>
          <div className="admin-switch-row">
            <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} onBlur={field.onBlur} name={field.name} ref={field.ref} disabled={busy} /></FormControl>
            <FormDescription>{field.value ? "Table is active and can be used" : "Table is inactive and cannot be used"}</FormDescription>
          </div>
        </FormItem>} />
      </fieldset>
      <div className="admin-form-footer">
        <Button type="button" variant="outline" className="admin-secondary-button" disabled={busy} onClick={onCancel}>Cancel</Button>
        <Button type="submit" className="admin-primary-button" disabled={busy}>
          {busy && <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />}
          {busy ? (mode === "create" ? "Creating…" : "Saving…") : mode === "create" ? "Create Table" : "Save Changes"}
        </Button>
      </div>
    </form>
  </Form>;
}
