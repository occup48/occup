export type RestaurantSettings = {
  id: string;
  key: string;
  restaurantName: string;
  openingTime: string;
  closingTime: string;
  reservationDuration: number;
  bookingInterval: number;
  createdAt: string;
  updatedAt: string;
};

export type SettingsUpdate = Partial<Pick<
  RestaurantSettings,
  "restaurantName" | "openingTime" | "closingTime" | "reservationDuration" | "bookingInterval"
>>;
