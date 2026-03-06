// Medical-grade timer engine with drift correction
// Uses absolute timestamps (Date.now()) instead of accumulating intervals
// Self-correcting: each tick calculates actual elapsed from start time

export interface TimerEngine {
  start: () => void;
  stop: () => void;
  reset: () => void;
  getElapsed: () => number;
  isRunning: () => boolean;
}

export interface CountdownTimer extends TimerEngine {
  getRemaining: () => number;
  isExpired: () => boolean;
  onExpire: (callback: () => void) => void;
  onTick: (callback: (remaining: number) => void) => void;
  onWarning: (callback: (remaining: number) => void) => void;
}

type TickCallback = (elapsed: number) => void;

const TICK_INTERVAL = 100; // 100ms for smooth display updates

export function createElapsedTimer(onTick?: TickCallback): TimerEngine {
  let startTime: number | null = null;
  let pausedElapsed = 0;
  let running = false;
  let intervalId: ReturnType<typeof setInterval> | null = null;

  function tick() {
    if (!running || startTime === null) return;
    const elapsed = Date.now() - startTime + pausedElapsed;
    onTick?.(elapsed);
  }

  return {
    start() {
      if (running) return;
      startTime = Date.now();
      running = true;
      intervalId = setInterval(tick, TICK_INTERVAL);
      tick(); // Immediate first tick
    },
    stop() {
      if (!running || startTime === null) return;
      pausedElapsed += Date.now() - startTime;
      startTime = null;
      running = false;
      if (intervalId !== null) {
        clearInterval(intervalId);
        intervalId = null;
      }
    },
    reset() {
      if (intervalId !== null) {
        clearInterval(intervalId);
        intervalId = null;
      }
      startTime = null;
      pausedElapsed = 0;
      running = false;
    },
    getElapsed() {
      if (startTime === null) return pausedElapsed;
      return Date.now() - startTime + pausedElapsed;
    },
    isRunning() {
      return running;
    },
  };
}

export function createCountdownTimer(
  durationMs: number,
  options?: {
    warningAtMs?: number;
    onTick?: (remaining: number) => void;
    onWarning?: (remaining: number) => void;
    onExpire?: () => void;
  }
): CountdownTimer {
  let startTime: number | null = null;
  let running = false;
  let intervalId: ReturnType<typeof setInterval> | null = null;
  let expired = false;
  let warningFired = false;

  const expireCallbacks: (() => void)[] = options?.onExpire ? [options.onExpire] : [];
  const tickCallbacks: ((remaining: number) => void)[] = options?.onTick ? [options.onTick] : [];
  const warningCallbacks: ((remaining: number) => void)[] = options?.onWarning ? [options.onWarning] : [];
  const warningThreshold = options?.warningAtMs ?? 10000; // Default: warn at 10 seconds

  function tick() {
    if (!running || startTime === null) return;
    const elapsed = Date.now() - startTime;
    const remaining = Math.max(0, durationMs - elapsed);

    tickCallbacks.forEach((cb) => cb(remaining));

    // Warning callback
    if (!warningFired && remaining <= warningThreshold && remaining > 0) {
      warningFired = true;
      warningCallbacks.forEach((cb) => cb(remaining));
    }

    // Expiry
    if (remaining <= 0 && !expired) {
      expired = true;
      expireCallbacks.forEach((cb) => cb());
    }
  }

  return {
    start() {
      if (running) return;
      startTime = Date.now();
      running = true;
      expired = false;
      warningFired = false;
      intervalId = setInterval(tick, TICK_INTERVAL);
      tick();
    },
    stop() {
      running = false;
      if (intervalId !== null) {
        clearInterval(intervalId);
        intervalId = null;
      }
    },
    reset() {
      if (intervalId !== null) {
        clearInterval(intervalId);
        intervalId = null;
      }
      startTime = null;
      running = false;
      expired = false;
      warningFired = false;
    },
    getElapsed() {
      if (startTime === null) return 0;
      return Date.now() - startTime;
    },
    getRemaining() {
      if (startTime === null) return durationMs;
      return Math.max(0, durationMs - (Date.now() - startTime));
    },
    isRunning() {
      return running;
    },
    isExpired() {
      return expired;
    },
    onExpire(callback: () => void) {
      expireCallbacks.push(callback);
    },
    onTick(callback: (remaining: number) => void) {
      tickCallbacks.push(callback);
    },
    onWarning(callback: (remaining: number) => void) {
      warningCallbacks.push(callback);
    },
  };
}

// Format milliseconds to MM:SS
export function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

// Format milliseconds to HH:MM:SS
export function formatTimeLong(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) {
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}
