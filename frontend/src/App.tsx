import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import BookingPage from "@/pages/BookingPage";
import BookingSuccessPage from "@/pages/BookingSuccessPage";
import HomePage from "@/pages/HomePage";
import ReservationDetailsPage from "@/pages/ReservationDetailsPage";
import ReservationsPage from "@/pages/ReservationsPage";
import SignInPage from "@/pages/SignInPage";
import SignUpPage from "@/pages/SignUpPage";

import { AuthProvider } from "@/features/auth/AuthProvider";

const App = () => (
  <BrowserRouter>
    <AuthProvider>
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/booking" element={<BookingPage />} />
      <Route path="/booking/success" element={<BookingSuccessPage />} />
      <Route path="/signin" element={<SignInPage />} />
      <Route path="/signup" element={<SignUpPage />} />
      <Route path="/sign-in" element={<Navigate to="/signin" replace />} />
      <Route path="/sign-up" element={<Navigate to="/signup" replace />} />
      <Route path="/reservations" element={<ReservationsPage />} />
      <Route path="/reservations/:id" element={<ReservationDetailsPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </AuthProvider>
  </BrowserRouter>
);

export default App;

