const ApiError = require('./ApiError');

// Converts "YYYY-MM-DD" to a Date at 00:00 UTC so one day is always one value.
const parseDay = (value) => {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(String(value))) {
    throw ApiError.badRequest('date must be in YYYY-MM-DD format');
  }
  const d = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime())) throw ApiError.badRequest('date is not a valid calendar date');
  return d;
};

module.exports = { parseDay };
