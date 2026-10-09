import { useRef, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { getSettingsError } from "./settings.service";
import { operatingHoursSchema, type OperatingHoursValues } from "./settings.schema";
import type { RestaurantSettings, SettingsUpdate } from "./settings.types";
import { SettingsFormCard } from "./SettingsFormCard";

type OperatingHoursFormProps = {
  settings: RestaurantSettings;
  onSave: (payload: SettingsUpdate) => Promise<RestaurantSettings>;
  saving: boolean;
};

export function OperatingHoursForm({ settings, onSave, saving }: OperatingHoursFormProps) {
  const savedValues = useRef({ openingTime: settings.openingTime, closingTime: settings.closingTime });
  const [feedback, setFeedback] = useState<{ kind: "success" | "error"; message: string } | null>(null);
  const form = useForm<OperatingHoursValues>({
    resolver: zodResolver(operatingHoursSchema),
    defaultValues: savedValues.current,
  });

  const submit = form.handleSubmit(async (values) => {
    setFeedback(null);
    const changes: SettingsUpdate = {};
    if (values.openingTime !== savedValues.current.openingTime) changes.openingTime = values.openingTime;
    if (values.closingTime !== savedValues.current.closingTime) changes.closingTime = values.closingTime;
    if (Object.keys(changes).length === 0) return;

    try {
      const updated = await onSave(changes);
      savedValues.current = { openingTime: updated.openingTime, closingTime: updated.closingTime };
      form.reset(savedValues.current);
      setFeedback({ kind: "success", message: "Operating hours saved." });
    } catch (error) {
      setFeedback({ kind: "error", message: getSettingsError(error) });
    }
  });

  return <Form {...form}>
    <SettingsFormCard
      title="Operating Hours"
      description="Configure when your restaurant opens and closes for reservations."
      onSubmit={submit}
      saving={saving}
      dirty={form.formState.isDirty}
      feedback={feedback}
    >
      <div className="settings-field-row">
        <FormField control={form.control} name="openingTime" render={({ field }) => <FormItem className="settings-field">
          <FormLabel>Opening Time <span aria-hidden="true">*</span></FormLabel>
          <FormControl><Input {...field} className="settings-input" type="time" step={60} required onChange={(event) => { field.onChange(event); setFeedback(null); }} /></FormControl>
          <FormDescription>First time customers may book a reservation.</FormDescription>
          <FormMessage />
        </FormItem>} />
        <FormField control={form.control} name="closingTime" render={({ field }) => <FormItem className="settings-field">
          <FormLabel>Closing Time <span aria-hidden="true">*</span></FormLabel>
          <FormControl><Input {...field} className="settings-input" type="time" step={60} required onChange={(event) => { field.onChange(event); setFeedback(null); }} /></FormControl>
          <FormDescription>The restaurant closes at this time.</FormDescription>
          <FormMessage />
        </FormItem>} />
      </div>
      <p className="settings-help-text">These times determine when customers can make reservations.</p>
    </SettingsFormCard>
  </Form>;
}
