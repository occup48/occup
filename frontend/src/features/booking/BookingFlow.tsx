import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { BookingSearchForm } from "./components/BookingSearchForm";
import { TableSelection } from "./components/TableSelection";
import { ReservationReview } from "./components/ReservationReview";
import { useAvailability } from "./hooks/useAvailability";
import { useCreateReservation } from "./hooks/useCreateReservation";
import type { Table } from "./types/booking";
import type { AvailabilitySearchFormValues } from "./validation/booking.schema";
import { parseInitialValues } from "./utils/parseInitialValues";
import { Button } from "@/components/ui/button";

type Step = "search" | "select-table" | "review";

export function BookingFlow() {
  const navigate = useNavigate();
  const [urlParams] = useSearchParams();
  const initialValues = parseInitialValues(urlParams);
  const [step, setStep] = useState<Step>("search");
  const [searchParams, setSearchParams] = useState<AvailabilitySearchFormValues | null>(null);
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [specialRequests, setSpecialRequests] = useState("");
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [acknowledgedUncertain, setAcknowledgedUncertain] = useState(false);

  const { tables, isLoading, error: searchError, search } = useAvailability();
  const { submit, isSubmitting, error: submitError, isUncertain, clearError } = useCreateReservation();

  const showUncertainBanner = isUncertain && !acknowledgedUncertain;

  const handleSearch = async (values: AvailabilitySearchFormValues) => {
    setRefreshError(null);
    setSearchParams(values);
    const success = await search(values);
    if (success) {
      setStep("select-table");
    }
  };

  const handleSelectTable = (table: Table) => {
    clearError(); // clear a stale error from a previous table, but leave any unresolved uncertain-outcome warning in place
    setRefreshError(null);
    setSelectedTable(table);
    setStep("review");
  };

  const handleConfirm = async () => {
    if (!searchParams || !selectedTable || showUncertainBanner) return;

    // Clear the acknowledgement before each new attempt, so a fresh uncertain
    // outcome shows its own warning instead of inheriting a past dismissal.
    setAcknowledgedUncertain(false);

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
      if (!refreshed) {
        setRefreshError(
          "That table is no longer available, and we couldn't refresh the list. Please try again.",
        );
      }
      setStep("select-table");
    }
  };

  return (
    <div className="max-w-md mx-auto p-4 space-y-4">
      {showUncertainBanner && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 space-y-3 text-sm">
          <p className="text-amber-900">
            We couldn't confirm whether your last reservation attempt went through. We don't
            currently have a way to look this up automatically — please wait a few minutes
            before booking a different table, since trying again now could create a duplicate
            reservation for the same time.
          </p>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => setAcknowledgedUncertain(true)}
          >
            I Understand — Continue Anyway
          </Button>
        </div>
      )}

      {step === "search" && (
        <BookingSearchForm
          key={urlParams.toString()}
          onSearch={handleSearch}
          isLoading={isLoading}
          errorMessage={searchError}
          initialValues={searchParams ?? initialValues}
        />
      )}

      {step === "select-table" && (
        <>
          {refreshError && <p className="text-sm text-red-500">{refreshError}</p>}
          <TableSelection
            tables={tables}
            selectedTableId={selectedTable?.id}
            onSelect={handleSelectTable}
            onBack={() => setStep("search")}
          />
        </>
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
            clearError();
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