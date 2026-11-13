"use client";

import { createContext, useContext } from "react";

const EngineersContext = createContext<readonly string[]>([]);

/** Engineer names from `/v1/users?role=engineer`, loaded by the (main) layout. */
export function EngineersProvider({
  engineers,
  children,
}: {
  engineers: readonly string[];
  children: React.ReactNode;
}) {
  return (
    <EngineersContext.Provider value={engineers}>
      {children}
    </EngineersContext.Provider>
  );
}

/** The engineer names for "Installed by" / "Engineer" selects. */
export function useEngineers() {
  return useContext(EngineersContext);
}
