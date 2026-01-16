/**
 * Shipping Utilities
 * Business days calculator and handling time options
 */

// US Federal Holidays (fixed dates - update annually or calculate dynamically)
// Format: 'MM-DD' for fixed holidays, calculated for floating holidays
const getHolidays = (year) => {
  const holidays = [
    `${year}-01-01`, // New Year's Day
    `${year}-07-04`, // Independence Day
    `${year}-12-25`, // Christmas Day
  ];

  // MLK Day - 3rd Monday of January
  holidays.push(getNthWeekdayOfMonth(year, 0, 1, 3));
  
  // Presidents Day - 3rd Monday of February
  holidays.push(getNthWeekdayOfMonth(year, 1, 1, 3));
  
  // Memorial Day - Last Monday of May
  holidays.push(getLastWeekdayOfMonth(year, 4, 1));
  
  // Labor Day - 1st Monday of September
  holidays.push(getNthWeekdayOfMonth(year, 8, 1, 1));
  
  // Thanksgiving - 4th Thursday of November
  holidays.push(getNthWeekdayOfMonth(year, 10, 4, 4));

  return holidays;
};

// Helper: Get nth weekday of a month (e.g., 3rd Monday)
const getNthWeekdayOfMonth = (year, month, weekday, n) => {
  const firstDay = new Date(year, month, 1);
  const firstWeekday = firstDay.getDay();
  let day = 1 + ((weekday - firstWeekday + 7) % 7) + (n - 1) * 7;
  const date = new Date(year, month, day);
  return date.toISOString().split('T')[0];
};

// Helper: Get last weekday of a month (e.g., last Monday of May)
const getLastWeekdayOfMonth = (year, month, weekday) => {
  const lastDay = new Date(year, month + 1, 0);
  const lastWeekday = lastDay.getDay();
  const diff = (lastWeekday - weekday + 7) % 7;
  const date = new Date(year, month + 1, -diff);
  return date.toISOString().split('T')[0];
};

/**
 * Check if a date is a weekend (Saturday or Sunday)
 */
const isWeekend = (date) => {
  const day = date.getDay();
  return day === 0 || day === 6;
};

/**
 * Check if a date is a US holiday
 */
const isHoliday = (date) => {
  const year = date.getFullYear();
  const dateStr = date.toISOString().split('T')[0];
  const holidays = getHolidays(year);
  return holidays.includes(dateStr);
};

/**
 * Check if a date is a business day (not weekend, not holiday)
 */
export const isBusinessDay = (date) => {
  return !isWeekend(date) && !isHoliday(date);
};

/**
 * Add business days to a date (skips weekends and holidays)
 * @param {Date} startDate - The starting date
 * @param {number} businessDays - Number of business days to add
 * @returns {Date} The resulting date after adding business days
 */
export const addBusinessDays = (startDate, businessDays) => {
  let currentDate = new Date(startDate);
  let daysAdded = 0;

  while (daysAdded < businessDays) {
    currentDate.setDate(currentDate.getDate() + 1);
    if (isBusinessDay(currentDate)) {
      daysAdded++;
    }
  }

  return currentDate;
};

/**
 * Format a date for display (e.g., "Tuesday, December 24")
 * @param {Date} date - The date to format
 * @returns {string} Formatted date string
 */
export const formatShipDate = (date) => {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric'
  });
};

/**
 * Calculate the estimated ship date based on handling days
 * @param {number} handlingDays - Number of business days for handling (default 3)
 * @returns {Object} Object with date and formatted string
 */
export const calculateShipDate = (handlingDays = 3) => {
  const today = new Date();
  const shipDate = addBusinessDays(today, handlingDays);
  return {
    date: shipDate,
    formatted: formatShipDate(shipDate)
  };
};

/**
 * Handling days options for vendor dropdown
 */
export const HANDLING_OPTIONS = [
  { value: 1, label: '1-2 business days' },
  { value: 3, label: '3-5 business days' },
  { value: 5, label: '5-7 business days' },
  { value: 7, label: '7-14 business days' },
  { value: 14, label: '14-21 business days (made to order)' },
  { value: 21, label: '21-30 business days (custom/large pieces)' }
];

/**
 * Get handling option label by value
 * @param {number} value - Handling days value
 * @returns {string} The label for the handling option
 */
export const getHandlingLabel = (value) => {
  const option = HANDLING_OPTIONS.find(o => o.value === value);
  return option ? option.label : '3-5 business days';
};

export default {
  addBusinessDays,
  calculateShipDate,
  formatShipDate,
  isBusinessDay,
  HANDLING_OPTIONS,
  getHandlingLabel
};

