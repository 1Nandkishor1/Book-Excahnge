import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./authSlice";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    // bookSlice, offerSlice, chatSlice follow the same createSlice
    // pattern as authSlice.js and plug in here as the app grows.
  },
});
