import { useRef, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { getSettingsError } from "./settings.service";
import { bookingRulesSchema, type BookingRulesInput, type BookingRulesValues } from "./settings.schema";
import type { RestaurantSettings, SettingsUpdate } from "./settings.types";
import { SettingsFormCard } from "./SettingsFormCard";

type BookingRulesFormProps = {
  settings: RestaurantSettings;
  onSave: (payload: SettingsUpdate) => Promise<RestaurantSettings>;
  saving: boolean;
};

export function BookingRulesForm({ settings, onSave, saving }: BookingRulesFormProps) {
  const savedValues = useRef({
    reservationDuration: settings.reservationDuration,
    bookingInterval: settings.bookingInterval,
  });
  const [feedback, setFeedback] = useState<{ kind: "success" | "error"; message: string } | null>(null);
  const form = useForm<BookingRulesInput, undefined, BookingRulesValues>({
    resolver: zodResolver(bookingRulesSchema),
    defaultValues: {
      reservationDuration: String(savedValues.current.reservationDuration),
      bookingInterval: String(savedValues.current.bookingInterval),
    },
  });

  const submit = form.handleSubmit(async (values) => {
    setFeedback(null);
    const changes: SettingsUpdate = {};
    const reservationDuration = Number(values.reservationDuration);
    const bookingInterval = Number(values.bookingInterval);
    if (reservationDuration !== savedValues.current.reservationDuration) changes.reservationDuration = reservationDuration;
    if (bookingInterval !== savedValues.current.bookingInterval) changes.bookingInterval = bookingInterval;
    if (Object.keys(changes).length === 0) return;

    try {
      const updated = await onSave(changes);
      savedValues.current = {
        reservationDuration: updated.reservationDuration,
        bookingInterval: updated.bookingInterval,
      };
      form.reset({
        reservationDuration: String(savedValues.current.reservationDuration),
        bookingInterval: String(savedValues.current.bookingInterval),
      });
      setFeedback({ kind: "success", message: "Booking rules saved." });
    } catch (error) {
      setFeedback({ kind: "error", message: getSettingsError(error) });
    }
  });

  return <Form {...form}>
    <SettingsFormCard
      title="Booking Rules"
      description="Control how customers reserve tables at your restaurant."
      onSubmit={submit}
      saving={saving}
      dirty={form.formState.isDirty}
      feedback={feedback}
    >
      <div className="settings-field-row">
        <FormField control={form.control} name="reservationDuration" render={({ field }) => <FormItem className="settings-field">
          <FormLabel>Reservation Duration <span aria-hidden="true">*</span></FormLabel>
          <div className="settings-input-with-suffix">
            <FormControl><Input {...field} className="settings-input" type="number" inputMode="numeric" min={30} max={240} step={1} onChange={(event) => { field.onChange(event); setFeedback(null); }} /></FormControl>
            <span aria-hidden="true">minutes</span>
          </div>
          <FormDescription>How long each reservation occupies a table.</FormDescription>
          <FormMessage />
        </FormItem>} />
        <FormField control={form.control} name="bookingInterval" render={({ field }) => <FormItem className="settings-field">
          <FormLabel>Booking Interval <span aria-hidden="true">*</span></FormLabel>
          <div className="settings-input-with-suffix">
            <FormControl><Input {...field} className="settings-input" type="number" inputMode="numeric" min={15} max={120} step={1} onChange={(event) => { field.onChange(event); setFeedback(null); }} /></FormControl>
            <span aria-hidden="true">minutes</span>
          </div>
          <FormDescription>The interval between available reservation start times.</FormDescription>
          <FormMessage />
        </FormItem>} />
      </div>
    </SettingsFormCard>
  </Form>;
}
