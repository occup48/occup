import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import BookingPage from "@/pages/BookingPage";
import BookingSuccessPage from "@/pages/BookingSuccessPage";
import HomePage from "@/pages/HomePage";
import ReservationDetailsPage from "@/pages/ReservationDetailsPage";
import ReservationsPage from "@/pages/ReservationsPage";
import SignInPage from "@/pages/SignInPage";
import SignUpPage from "@/pages/SignUpPage";

const App = () => (
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/booking" element={<BookingPage />} />
      <Route path="/booking/success" element={<BookingSuccessPage />} />
      <Route path="/sign-in" element={<SignInPage />} />
      <Route path="/sign-up" element={<SignUpPage />} />
      <Route path="/reservations" element={<ReservationsPage />} />
      <Route path="/reservations/:id" element={<ReservationDetailsPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  </BrowserRouter>
);

export default App;
