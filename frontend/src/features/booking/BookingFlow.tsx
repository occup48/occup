import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { BookingStepper } from "./components/BookingStepper";
import { DateGuestsStep } from "./components/DateGuestsStep";
import { TimeStep } from "./components/TimeStep";
import { TableSelection } from "./components/TableSelection";
import { ReservationReview } from "./components/ReservationReview";
import { TIME_SLOTS } from "./constants/time-slots";
import { useAvailability } from "./hooks/useAvailability";
import { useCreateReservation } from "./hooks/useCreateReservation";
import type { Table } from "./types/booking";
import type { AvailabilitySearchFormValues } from "./validation/booking.schema";
import { parseInitialValues } from "./utils/parseInitialValues";
import { addDaysToDateString, parseDateString } from "./utils/dates";
import { isFutureBookingTime, restaurantNow } from "@/features/restaurant/utils/booking-time";
import { RESTAURANT_TIMEZONE } from "@/features/restaurant/restaurant-timezone";
import { Button } from "@/components/ui/button";

type Step = "date" | "time" | "table" | "review";
type InitialValues = ReturnType<typeof parseInitialValues>;

const SIGN_IN_REDIRECT_DELAY_MS = 2000;
const DEFAULT_PARTY_SIZE = 2;

function BookingWizard({ initialValues }: { initialValues: InitialValues }) {
  const navigate = useNavigate();
  const today = restaurantNow(new Date(), RESTAURANT_TIMEZONE).date;

  const [step, setStep] = useState<Step>("date");
  // Like the homepage widget, start from tomorrow unless the link says otherwise.
  const [date, setDate] = useState(() => initialValues.date ?? addDaysToDateString(today, 1));
  const [partySize, setPartySize] = useState(initialValues.partySize ?? DEFAULT_PARTY_SIZE);
  const [time, setTime] = useState(() => {
    const linked = initialValues.time;
    return linked && TIME_SLOTS.some((slot) => slot.value === linked) ? linked : "";
  });
  // What the table list and the reservation were checked against.
  const [searched, setSearched] = useState<AvailabilitySearchFormValues | null>(null);
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [specialRequests, setSpecialRequests] = useState("");
  const [timeError, setTimeError] = useState<string | null>(null);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [acknowledgedUncertain, setAcknowledgedUncertain] = useState(false);
  const [redirectingToSignIn, setRedirectingToSignIn] = useState(false);
  const redirectTimer = useRef<number | null>(null);

  const { tables, isLoading, error: searchError, search } = useAvailability();
  const { submit, isSubmitting, error: submitError, isUncertain, clearError } = useCreateReservation();

  const showUncertainBanner = isUncertain && !acknowledgedUncertain;

  // Don't redirect a guest who has already left this page.
  useEffect(
    () => () => {
      if (redirectTimer.current !== null) window.clearTimeout(redirectTimer.current);
    },
    [],
  );

  // If the guest goes back or searches again during the delay, drop the pending
  // redirect so it can't send them to sign in with an outdated search.
  const cancelSignInRedirect = () => {
    if (redirectTimer.current !== null) {
      window.clearTimeout(redirectTimer.current);
      redirectTimer.current = null;
    }
    setRedirectingToSignIn(false);
  };

  const handleDateNext = () => {
    // A preselected time may already have passed for the chosen day.
    if (time && !isFutureBookingTime(parseDateString(date), time, new Date(), RESTAURANT_TIMEZONE)) {
      setTime("");
    }
    setTimeError(null);
    setStep("time");
  };

  const handleTimeNext = async () => {
    if (!time) return;
    cancelSignInRedirect();
    if (!isFutureBookingTime(parseDateString(date), time, new Date(), RESTAURANT_TIMEZONE)) {
      setTime("");
      setTimeError("That time has just passed. Please choose a later time.");
      return;
    }
    setTimeError(null);
    setRefreshError(null);
    setSelectedTable(null);
    const values = { date, time, partySize };
    setSearched(values);
    const success = await search(values);
    if (success) {
      setStep("table");
    }
  };

  const handleSelectTable = (table: Table) => {
    clearError(); // clear a stale error from a previous table, but leave any unresolved uncertain-outcome warning in place
    setRefreshError(null);
    setSelectedTable(table);
  };

  const handleConfirm = async () => {
    if (!searched || !selectedTable || showUncertainBanner || redirectingToSignIn) return;

    // Clear the acknowledgement before each new attempt, so a fresh uncertain
    // outcome shows its own warning instead of inheriting a past dismissal.
    setAcknowledgedUncertain(false);

    const { reservation, status } = await submit({
      tableId: selectedTable.id,
      reservationDate: searched.date,
      startTime: searched.time,
      partySize: searched.partySize,
      specialRequests: specialRequests || undefined,
    });

    if (reservation) {
      navigate("/booking/success", { state: { reservation } });
      return;
    }

    if (status === 401) {
      // Not signed in (or the session expired): show the message, then send the
      // guest to sign in and bring them back to the search they just made.
      const returnTo =
        "/booking?" +
        new URLSearchParams({
          date: searched.date,
          guests: String(searched.partySize),
          time: searched.time,
        }).toString();
      setRedirectingToSignIn(true);
      redirectTimer.current = window.setTimeout(() => {
        navigate("/signin", { state: { from: returnTo } });
      }, SIGN_IN_REDIRECT_DELAY_MS);
      return;
    }

    if (status === 409) {
      setSelectedTable(null);
      setRefreshError(null);
      const refreshed = await search(searched);
      if (!refreshed) {
        setRefreshError(
          "That table is no longer available, and we couldn't refresh the list. Please try again.",
        );
      }
      setStep("table");
    }
  };

  const stepNumber = step === "date" ? 1 : step === "time" ? 2 : 3;

  return (
    <div className="mx-auto w-full max-w-md p-4">
      <div className="space-y-6 rounded-3xl border bg-card p-5 shadow-sm">
        <BookingStepper current={stepNumber} complete={step === "review"} />

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

        {step === "date" && (
          <DateGuestsStep
            date={date}
            partySize={partySize}
            minDate={today}
            onDateChange={setDate}
            onPartySizeChange={setPartySize}
            onNext={handleDateNext}
          />
        )}

        {step === "time" && (
          <TimeStep
            date={date}
            time={time}
            isSearching={isLoading}
            errorMessage={timeError ?? searchError}
            onSelect={setTime}
            onBack={() => setStep("date")}
            onNext={handleTimeNext}
          />
        )}

        {step === "table" && (
          <>
            {refreshError && (
              <p role="alert" className="text-sm text-red-500">
                {refreshError}
              </p>
            )}
            <TableSelection
              tables={tables}
              selectedTableId={selectedTable?.id}
              onSelect={handleSelectTable}
              onBack={() => setStep("time")}
              onNext={() => {
                if (selectedTable) setStep("review");
              }}
            />
          </>
        )}

        {step === "review" && searched && selectedTable && (
          <ReservationReview
            date={searched.date}
            time={searched.time}
            partySize={searched.partySize}
            table={selectedTable}
            specialRequests={specialRequests}
            onSpecialRequestsChange={setSpecialRequests}
            onBack={() => {
              cancelSignInRedirect();
              clearError();
              setRefreshError(null);
              setStep("table");
            }}
            onConfirm={handleConfirm}
            isSubmitting={isSubmitting}
            errorMessage={
              redirectingToSignIn
                ? "Please sign in to book a table. Taking you to the sign-in page..."
                : refreshError ?? submitError
            }
            confirmDisabled={showUncertainBanner || redirectingToSignIn}
          />
        )}
      </div>
    </div>
  );
}

export function BookingFlow() {
  const [urlParams] = useSearchParams();
  const initialValues = parseInitialValues(
    urlParams,
    restaurantNow(new Date(), RESTAURANT_TIMEZONE).date,
  );
  // Remount when the link changes, so going to a plain /booking starts fresh.
  return <BookingWizard key={urlParams.toString()} initialValues={initialValues} />;
}
