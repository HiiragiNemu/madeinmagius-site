// Retired iOS experiment. Compatibility exports for previously cached app.js.
// No scroll interception, timers, mutations, storage, or native overflow changes.
export function paintScrollRequested() { return false; }
export function startIOSPaintScroll() { return () => {}; }
