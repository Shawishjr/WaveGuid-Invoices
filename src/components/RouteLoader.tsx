"use client";

import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

const MIN_VISIBLE_MS = 350;
const FALLBACK_TIMEOUT_MS = 4000;
const ROUTE_START_EVENT = "waveguid:route-start";

export function startRouteLoader() {
  window.dispatchEvent(new CustomEvent(ROUTE_START_EVENT));
}

export default function RouteLoader() {
  const pathname = usePathname();
  const [isLoading, setIsLoading] = useState(false);
  const shownAtRef = useRef(0);
  const fallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimers = useCallback(() => {
    if (fallbackTimerRef.current) {
      clearTimeout(fallbackTimerRef.current);
      fallbackTimerRef.current = null;
    }
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  }, []);

  const start = useCallback(() => {
    clearTimers();
    shownAtRef.current = Date.now();
    setIsLoading(true);
    fallbackTimerRef.current = setTimeout(() => {
      setIsLoading(false);
      fallbackTimerRef.current = null;
    }, FALLBACK_TIMEOUT_MS);
  }, [clearTimers]);

  const stop = useCallback(() => {
    if (fallbackTimerRef.current) {
      clearTimeout(fallbackTimerRef.current);
      fallbackTimerRef.current = null;
    }
    const remaining = MIN_VISIBLE_MS - (Date.now() - shownAtRef.current);
    if (remaining > 0) {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      hideTimerRef.current = setTimeout(() => {
        hideTimerRef.current = null;
        setIsLoading(false);
      }, remaining);
    } else {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }
      const target = event.target as HTMLElement | null;
      const anchor = target?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!anchor) return;
      if (anchor.target && anchor.target !== "_self") return;
      if (anchor.hasAttribute("download")) return;
      let url: URL;
      try {
        url = new URL(anchor.href, window.location.href);
      } catch {
        return;
      }
      if (url.origin !== window.location.origin) return;
      if (url.protocol !== "http:" && url.protocol !== "https:") return;
      if (url.pathname.startsWith("/api/")) return;
      if (
        url.pathname === window.location.pathname &&
        url.search === window.location.search
      ) {
        return;
      }
      start();
    }

    function handleRouteStart() {
      start();
    }

    document.addEventListener("click", handleClick, true);
    window.addEventListener(ROUTE_START_EVENT, handleRouteStart);
    return () => {
      document.removeEventListener("click", handleClick, true);
      window.removeEventListener(ROUTE_START_EVENT, handleRouteStart);
    };
  }, [start]);

  useEffect(() => {
    stop();
  }, [pathname, stop]);

  useEffect(() => clearTimers, [clearTimers]);

  if (!isLoading) return null;

  return (
    <div className="route-loader" role="status" aria-live="polite" aria-label="Loading page">
      <div className="route-loader-brand">
        <img src="/WAVELOGO.svg" alt="WaveGuid" className="route-loader-logo route-loader-logo-light" />
        <img src="/LOGODARK.SVG" alt="WaveGuid" className="route-loader-logo route-loader-logo-dark" />
      </div>
    </div>
  );
}
