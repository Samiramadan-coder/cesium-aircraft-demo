"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ActionResult } from "@/lib/api/errors";

export type LoadState<T> =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; data: T };

/**
 * Runs `load(key)` whenever `key` becomes a non-null value (e.g. a tracker id
 * when a dialog opens) and tracks loading / error / ready. A response that
 * arrives after the key changed is ignored.
 */
export function useLoad<T>(
  key: string | null,
  load: (key: string) => Promise<ActionResult<T>>,
  onReady?: (data: T) => void,
) {
  const [state, setState] = useState<LoadState<T>>({ status: "loading" });

  // Always call the latest callbacks without re-running the effect.
  const loadRef = useRef(load);
  const onReadyRef = useRef(onReady);
  useEffect(() => {
    loadRef.current = load;
    onReadyRef.current = onReady;
  });

  const requestId = useRef(0);
  const run = useCallback(async (value: string) => {
    const id = ++requestId.current;
    setState({ status: "loading" });
    const result = await loadRef.current(value);
    if (id !== requestId.current) return;
    if (result.ok) {
      onReadyRef.current?.(result.data);
      setState({ status: "ready", data: result.data });
    } else {
      setState({ status: "error", message: result.message });
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- load when the key changes
    if (key) run(key);
  }, [key, run]);

  const retry = useCallback(() => {
    if (key) run(key);
  }, [key, run]);

  return { state, retry };
}
