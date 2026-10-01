import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { BookingSearchForm } from "./components/BookingSearchForm";
import { TableSelection } from "./components/TableSelection";
import { ReservationReview } from "./components/ReservationReview";
import { useAvailability } from "./hooks/useAvailability";
import { useCreateReservation } from "./hooks/useCreateReservation";
import type { Table } from "./types/booking";
import type { AvailabilitySearchFormValues } from "./validation/booking.schema";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

type Step = "search" | "select-table" | "review";

export function BookingFlow() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("search");
  const [searchParams, setSearchParams] = useState<AvailabilitySearchFormValues | null>(null);
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [specialRequests, setSpecialRequests] = useState("");
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [acknowledgedUncertain, setAcknowledgedUncertain] = useState(false);

  const { tables, isLoading, error: searchError, search } = useAvailability();
  const { submit, isSubmitting, error: submitError, isUncertain } = useCreateReservation();

  // The uncertain-outcome warning is NOT cleared by Back or reselecting a table —
  // only by the guest explicitly acknowledging it, since we currently have no way
  // to verify whether the original reservation actually went through.
  const showUncertainBanner = isUncertain && !acknowledgedUncertain;

  const handleSearch = async (values: AvailabilitySearchFormValues) => {
    setSearchParams(values);
    const success = await search(values);
    if (success) {
      setStep("select-table");
    }
  };

  const handleSelectTable = (table: Table) => {
    setSelectedTable(table);
    setStep("review");
  };

  const handleConfirm = async () => {
    if (!searchParams || !selectedTable || showUncertainBanner) return;

    const { reservation, status } = await submit({
      tableId: selectedTable.id,
      reservationDate: searchParams.date,
      startTime: searchParams.time,
      partySize: searchParams.partySize,
      specialRequests: specialRequests || undefined,
    });

    if (reservation) {
      navigate("/booking/success", { state: { reservation } });
      return;
    }

    if (status === 409) {
      setSelectedTable(null);
      setRefreshError(null);
      const refreshed = await search(searchParams);
      if (refreshed) {
        setStep("select-table");
      } else {
        setRefreshError(
          "That table is no longer available, and we couldn't refresh the list. Please try again.",
        );
      }
    }
  };

  return (
    <div className="max-w-md mx-auto p-4 space-y-4">
      {showUncertainBanner && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 space-y-3 text-sm">
          <p className="text-amber-900">
            We couldn't confirm whether your last reservation attempt went through. Please
            contact us to verify before trying again — booking a different table could result
            in two reservations.
          </p>
          <div className="flex gap-2">
            <a href="tel:+10000000000" className="flex-1">
              <Button variant="outline" className="w-full">
                Contact Us
              </Button>
            </a>
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setAcknowledgedUncertain(true)}
            >
              I've Verified — Continue
            </Button>
          </div>
        </div>
      )}

      {step === "search" && (
        <BookingSearchForm onSearch={handleSearch} isLoading={isLoading} errorMessage={searchError} />
      )}

      {step === "select-table" && (
        <TableSelection
          tables={tables}
          selectedTableId={selectedTable?.id}
          onSelect={handleSelectTable}
          onBack={() => setStep("search")}
        />
      )}

      {step === "review" && searchParams && selectedTable && (
        <ReservationReview
          date={searchParams.date}
          time={searchParams.time}
          partySize={searchParams.partySize}
          table={selectedTable}
          specialRequests={specialRequests}
          onSpecialRequestsChange={setSpecialRequests}
          onBack={() => {
            setRefreshError(null);
            setStep("select-table");
          }}
          onConfirm={handleConfirm}
          isSubmitting={isSubmitting}
          errorMessage={refreshError ?? submitError}
          confirmDisabled={showUncertainBanner}
        />
      )}
    </div>
  );
}