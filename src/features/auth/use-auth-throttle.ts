import { useRef, useState } from "react";

const MAX_ATTEMPTS = 5;
const COOLDOWN_MS = 30_000;

export function useAuthThrottle() {
  const [isThrottled, setIsThrottled] = useState(false);
  const attemptsRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const startCooldown = () => {
    setIsThrottled(true);
    timerRef.current = setTimeout(() => {
      setIsThrottled(false);
      attemptsRef.current = 0;
    }, COOLDOWN_MS);
  };

  const recordFailure = (error?: unknown) => {
    const isRateLimited =
      error instanceof Error &&
      (error.message.toLowerCase().includes("rate") || error.message.includes("429"));

    if (isRateLimited) {
      startCooldown();
      return;
    }

    attemptsRef.current += 1;
    if (attemptsRef.current >= MAX_ATTEMPTS) {
      startCooldown();
    }
  };

  const recordSuccess = () => {
    attemptsRef.current = 0;
    setIsThrottled(false);
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  return { isThrottled, recordFailure, recordSuccess };
}
