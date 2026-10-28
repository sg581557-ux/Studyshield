import { useEffect, useLayoutEffect } from "react";

/**
 * Ref-counted scroll lock for multiple overlays (drawer, command palette,
 * streak popup). Previous impl each did `body.overflow = hidden` and restored
 * unconditionally, so closing one while another was open unlocked scrolling.
 *
 * This hook tracks holders in a global Set. `active` true → acquire(id),
 * false → release(id). Only the last release restores prev overflow for
 * both `body` and `documentElement` + scrollbar compensation.
 */
const holders = new Set<string>();
let prevBodyOverflow = "";
let prevHtmlOverflow = "";
let prevBodyPaddingRight = "";
let prevBodyOverscroll = "";
let prevHtmlOverscroll = "";
let locked = false;

function getScrollbarWidth(): number {
  if (typeof window === "undefined") return 0;
  return Math.max(0, window.innerWidth - document.documentElement.clientWidth);
}

function applyLock() {
  if (locked) return;
  const body = document.body;
  const html = document.documentElement;
  // Save computed inline values (empty if via class)
  prevBodyOverflow = body.style.overflow;
  prevHtmlOverflow = html.style.overflow;
  prevBodyPaddingRight = body.style.paddingRight;
  prevBodyOverscroll = (body.style as unknown as Record<string, string>).overscrollBehavior ?? "";
  prevHtmlOverscroll = (html.style as unknown as Record<string, string>).overscrollBehavior ?? "";
  const sw = getScrollbarWidth();
  body.style.overflow = "hidden";
  html.style.overflow = "hidden";
  // Prevent background overscroll bleed (iOS/Android)
  // Use CSS property via style; fallback if unsupported is harmless
  (body.style as unknown as Record<string, string>).overscrollBehavior = "contain";
  (html.style as unknown as Record<string, string>).overscrollBehavior = "contain";
  if (sw > 0) {
    // Avoid layout shift when scrollbar disappears
    body.style.paddingRight = `${sw}px`;
  }
  locked = true;
}

function releaseLock() {
  if (!locked) return;
  const body = document.body;
  const html = document.documentElement;
  body.style.overflow = prevBodyOverflow;
  html.style.overflow = prevHtmlOverflow;
  body.style.paddingRight = prevBodyPaddingRight;
  (body.style as unknown as Record<string, string>).overscrollBehavior = prevBodyOverscroll;
  (html.style as unknown as Record<string, string>).overscrollBehavior = prevHtmlOverscroll;
  locked = false;
}

export function acquireScrollLock(id: string) {
  holders.add(id);
  if (holders.size === 1) applyLock();
}

export function releaseScrollLock(id: string) {
  holders.delete(id);
  if (holders.size === 0) releaseLock();
}

export function forceReleaseAllScrollLocks() {
  holders.clear();
  releaseLock();
  // Hard heal: ensure inline overflow is cleared even if prev was stale
  try {
    const body = document.body;
    const html = document.documentElement;
    // If still hidden due to stale prev, force clear once
    if (body.style.overflow === "hidden" && !holders.size) body.style.overflow = "";
    if (html.style.overflow === "hidden" && !holders.size) html.style.overflow = "";
  } catch {
    // ignore
  }
}

/**
 * Hook: when `active` true, holds lock for `id`. Auto-releases on unmount.
 * Uses layout effect so lock is applied before browser paint, avoiding flash.
 * Fix: only acquire on active=true and release in cleanup — avoids double-release
 * when toggling true→false (previous impl did else release + cleanup release).
 */
export function useScrollLock(active: boolean, id: string) {
  const effect = typeof window !== "undefined" ? useLayoutEffect : useEffect;
  effect(() => {
    if (active) {
      acquireScrollLock(id);
      return () => {
        releaseScrollLock(id);
      };
    }
    return undefined;
  }, [active, id]);
}
