export const getTodayString = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const parseDate = (dateStr: string): Date => {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, (month || 1) - 1, day || 1);
};

export const formatDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const addDays = (dateStr: string, days: number): string => {
  const date = parseDate(dateStr);
  date.setDate(date.getDate() + days);
  return formatDate(date);
};

export const daysDiff = (startDateStr: string, endDateStr: string): number => {
  const start = parseDate(startDateStr);
  const end = parseDate(endDateStr);
  const diffTime = end.getTime() - start.getTime();
  return Math.round(diffTime / (1000 * 60 * 60 * 24));
};

export const getDayOfWeekStr = (dateStr: string): string => {
  const dayIndex = parseDate(dateStr).getDay();
  const days = ['日', '月', '火', '水', '木', '金', '土'];
  return days[dayIndex];
};

export const isWeekend = (dateStr: string): boolean => {
  const dayIndex = parseDate(dateStr).getDay();
  return dayIndex === 0 || dayIndex === 6;
};

export const isSunday = (dateStr: string): boolean => {
  return parseDate(dateStr).getDay() === 0;
};

export const isSaturday = (dateStr: string): boolean => {
  return parseDate(dateStr).getDay() === 6;
};

export const isOverdue = (endDateStr: string, status: string, todayStr: string = getTodayString()): boolean => {
  if (status === 'completed') return false;
  return endDateStr < todayStr;
};

export const formatDisplayDate = (dateStr: string): string => {
  if (!dateStr) return '-';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const month = parseInt(parts[1], 10);
  const day = parseInt(parts[2], 10);
  const dow = getDayOfWeekStr(dateStr);
  return `${month}/${day}(${dow})`;
};

export const formatShortDate = (dateStr: string): string => {
  if (!dateStr) return '-';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  return `${parseInt(parts[1], 10)}/${parseInt(parts[2], 10)}`;
};
