import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  availabilitySearchSchema,
  type AvailabilitySearchFormInput,
  type AvailabilitySearchFormValues,
} from "../validation/booking.schema";

interface Props {
  onSearch: (values: AvailabilitySearchFormValues) => void;
  isLoading: boolean;
  errorMessage?: string | null;
}

export function BookingSearchForm({ onSearch, isLoading, errorMessage }: Props) {
  const {
    register,
    handleSubmit,
    formState: { errors },
} = useForm<AvailabilitySearchFormInput, unknown, AvailabilitySearchFormValues>({
    resolver: zodResolver(availabilitySearchSchema),
  });
  
  return (
    <form onSubmit={handleSubmit(onSearch)} className="space-y-4">
      <div>
        <Label htmlFor="date">Date</Label>
        <Input id="date" type="date" {...register("date")} />
        {errors.date && <p className="text-sm text-red-500">{errors.date.message}</p>}
      </div>

      <div>
        <Label htmlFor="time">Time</Label>
        <Input id="time" type="time" {...register("time")} />
        {errors.time && <p className="text-sm text-red-500">{errors.time.message}</p>}
      </div>

      <div>
        <Label htmlFor="partySize">Party Size</Label>
        <Input id="partySize" type="number" min={1} max={20} {...register("partySize")} />
        {errors.partySize && (
          <p className="text-sm text-red-500">{errors.partySize.message}</p>
        )}
      </div>

      {errorMessage && <p className="text-sm text-red-500">{errorMessage}</p>}

      <Button type="submit" disabled={isLoading} className="w-full">
        {isLoading ? "Checking..." : "Check Availability"}
      </Button>
    </form>
  );
}