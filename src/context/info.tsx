import { useState, createContext, ReactNode } from "react";
export type ContextType = {
  siteName: string;
};
export const UserContext = createContext({ siteName: "Subtitles Remover" });
export function UserProvider({ children }: { children: ReactNode }) {
  return (
    <UserContext.Provider value={{ siteName: "Subtitles Remover" }}>
      {children}
    </UserContext.Provider>
  );
}
