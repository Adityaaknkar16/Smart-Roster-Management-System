export function getDaysInMonth(month: number, year: number): string[] {
  const dates: string[] = [];
  const daysCount = new Date(year, month, 0).getDate();
  for (let d = 1; d <= daysCount; d++) {
    const dayStr = String(d).padStart(2, '0');
    const monthStr = String(month).padStart(2, '0');
    dates.push(`${year}-${monthStr}-${dayStr}`);
  }
  return dates;
}

export function getWeekday(dateStr: string): number {
  // Returns 0 = Sunday, 1 = Monday, ... 6 = Saturday
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d).getDay();
}

export function formatHumanDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

export function getWeekNumber(dateStr: string): number {
  // Simple week grouping: day of month divided into 7-day buckets (1-7 = W1, 8-14 = W2, etc.)
  const d = parseInt(dateStr.split('-')[2], 10);
  return Math.floor((d - 1) / 7) + 1;
}

export function groupDatesByWeek(dates: string[]): Record<number, string[]> {
  const weeks: Record<number, string[]> = {};
  for (const date of dates) {
    const w = getWeekNumber(date);
    if (!weeks[w]) weeks[w] = [];
    weeks[w].push(date);
  }
  return weeks;
}

export function isSameDay(d1: string, d2: string): boolean {
  return d1 === d2;
}

export function isDateInRange(targetDate: string, startDate: string, endDate: string): boolean {
  return targetDate >= startDate && targetDate <= endDate;
}
