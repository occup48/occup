import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { BookingSearchForm } from "./components/BookingSearchForm";
import { TableSelection } from "./components/TableSelection";
import { ReservationReview } from "./components/ReservationReview";
import { useAvailability } from "./hooks/useAvailability";
import { useCreateReservation } from "./hooks/useCreateReservation";
import type { Table } from "./types/booking";
import type { AvailabilitySearchFormValues } from "./validation/booking.schema";

type Step = "search" | "select-table" | "review";

export function BookingFlow() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("search");
  const [searchParams, setSearchParams] = useState<AvailabilitySearchFormValues | null>(null);
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [specialRequests, setSpecialRequests] = useState("");
  const [refreshError, setRefreshError] = useState<string | null>(null);

  const { tables, isLoading, error: searchError, search } = useAvailability();
  const { submit, isSubmitting, error: submitError, isUncertain, reset } = useCreateReservation();

  const handleSearch = async (values: AvailabilitySearchFormValues) => {
    setSearchParams(values);
    const success = await search(values);
    if (success) {
      setStep("select-table");
    }
  };

  const handleSelectTable = (table: Table) => {
    reset(); // clear any leftover uncertain/error state from a previous attempt
    setSelectedTable(table);
    setStep("review");
  };

  const handleConfirm = async () => {
    if (!searchParams || !selectedTable) return;

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
        // Refresh itself failed — stay on review with a clear error rather than
        // showing an empty table list that looks like "nothing available".
        setRefreshError(
          "That table is no longer available, and we couldn't refresh the list. Please try again.",
        );
      }
    }
  };

  return (
    <div className="max-w-md mx-auto p-4">
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
            reset();
            setRefreshError(null);
            setStep("select-table");
          }}
          onConfirm={handleConfirm}
          isSubmitting={isSubmitting}
          errorMessage={refreshError ?? submitError}
          isUncertain={isUncertain}
        />
      )}
    </div>
  );
}