import { useState, useEffect } from 'react';

interface CountdownResult {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isOverdue: boolean;
  isExpiringSoon: boolean;
}

export function useCountdown(endTime?: number): CountdownResult | null {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!endTime) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [endTime]);

  if (!endTime) return null;

  const diff = endTime - now;
  const abs = Math.abs(diff);

  return {
    days: Math.floor(abs / 86400000),
    hours: Math.floor((abs / 3600000) % 24),
    minutes: Math.floor((abs / 60000) % 60),
    seconds: Math.floor((abs / 1000) % 60),
    isOverdue: diff < 0,
    isExpiringSoon: diff > 0 && diff < 3600000,
  };
}
