import "@testing-library/jest-dom/vitest";

// jsdom does not implement ResizeObserver, which recharts' ResponsiveContainer
// requires to measure its container. Provide a no-op polyfill for tests.
class ResizeObserverPolyfill {
  observe() {}
  unobserve() {}
  disconnect() {}
}

if (typeof globalThis.ResizeObserver === "undefined") {
  globalThis.ResizeObserver = ResizeObserverPolyfill as unknown as typeof ResizeObserver;
}

// jsdom does not perform layout, so Element.getBoundingClientRect() always
// returns an all-zero rect. recharts' ResponsiveContainer reads this directly
// to size its chart (independent of the ResizeObserver callback above), so a
// zero-size rect makes it render at 0x0 width and produce no visible output.
// Stub a fixed non-zero size so chart content actually renders under tests.
Element.prototype.getBoundingClientRect = () => ({
  width: 800,
  height: 600,
  top: 0,
  left: 0,
  right: 800,
  bottom: 600,
  x: 0,
  y: 0,
  toJSON() {
    return this;
  },
});
