import { useRef, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { getSettingsError } from "./settings.service";
import { generalSettingsSchema, type GeneralSettingsValues } from "./settings.schema";
import type { RestaurantSettings, SettingsUpdate } from "./settings.types";
import { SettingsFormCard } from "./SettingsFormCard";

type GeneralSettingsFormProps = {
  settings: RestaurantSettings;
  onSave: (payload: SettingsUpdate) => Promise<RestaurantSettings>;
  saving: boolean;
};

export function GeneralSettingsForm({ settings, onSave, saving }: GeneralSettingsFormProps) {
  const savedName = useRef(settings.restaurantName);
  const [feedback, setFeedback] = useState<{ kind: "success" | "error"; message: string } | null>(null);
  const form = useForm<GeneralSettingsValues>({
    resolver: zodResolver(generalSettingsSchema),
    defaultValues: { restaurantName: settings.restaurantName },
  });

  const submit = form.handleSubmit(async (values) => {
    setFeedback(null);
    const restaurantName = values.restaurantName.trim();
    if (restaurantName === savedName.current) return;
    try {
      const updated = await onSave({ restaurantName });
      savedName.current = updated.restaurantName;
      form.reset({ restaurantName: updated.restaurantName });
      setFeedback({ kind: "success", message: "Restaurant name saved." });
    } catch (error) {
      setFeedback({ kind: "error", message: getSettingsError(error) });
    }
  });

  return <Form {...form}>
    <SettingsFormCard
      title="Restaurant Information"
      description="Manage the name customers see when booking a table."
      onSubmit={submit}
      saving={saving}
      dirty={form.formState.isDirty}
      feedback={feedback}
    >
      <FormField control={form.control} name="restaurantName" render={({ field }) => <FormItem className="settings-field">
        <FormLabel>Restaurant Name <span aria-hidden="true">*</span></FormLabel>
        <FormControl><Input
          {...field}
          className="settings-input"
          autoComplete="organization"
          maxLength={100}
          onChange={(event) => { field.onChange(event); setFeedback(null); }}
        /></FormControl>
        <FormDescription>This name appears throughout the reservation experience.</FormDescription>
        <FormMessage />
      </FormItem>} />
    </SettingsFormCard>
  </Form>;
}
