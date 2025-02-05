import { configureStore } from "@reduxjs/toolkit";

import { TypedUseSelectorHook, useSelector } from "react-redux";

const store = configureStore({
  reducer: {},
});
export type AppStore = typeof store;
export type RootState = ReturnType<AppStore["getState"]>;
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
export default store;
