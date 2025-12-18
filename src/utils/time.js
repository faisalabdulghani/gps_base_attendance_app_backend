// src/utils/time.js

const PKT_OFFSET_MS = 5 * 60 * 60 * 1000; // UTC +5 hours in milliseconds

/**
 * Get current UTC time
 * @returns {Date}
 */
function nowUTC() {
    return new Date();
}

/**
 * Get current time in PKT (as UTC Date object adjusted for PKT)
 * @returns {Date}
 */
function nowPKT() {
    const utc = new Date();
    return new Date(utc.getTime() + PKT_OFFSET_MS);
}

/**
 * Get today's date string in PKT timezone (YYYY-MM-DD)
 * @returns {string}
 */
function getTodayDatePKT() {
    const pktNow = nowPKT();
    const year = pktNow.getUTCFullYear();
    const month = String(pktNow.getUTCMonth() + 1).padStart(2, '0');
    const day = String(pktNow.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * Get specific date string in PKT timezone (YYYY-MM-DD)
 * @param {Date} date - UTC date
 * @returns {string}
 */
function getDateStringPKT(date) {
    const pktDate = new Date(date.getTime() + PKT_OFFSET_MS);
    const year = pktDate.getUTCFullYear();
    const month = String(pktDate.getUTCMonth() + 1).padStart(2, '0');
    const day = String(pktDate.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * Get start of day in PKT (00:00:00) as UTC Date
 * @param {string} dateString - YYYY-MM-DD format
 * @returns {Date}
 */
function startOfDayPKT(dateString = null) {
    const dateStr = dateString || getTodayDatePKT();
    // Parse as PKT time and convert to UTC
    const pktDate = new Date(`${dateStr}T00:00:00.000+05:00`);
    return pktDate;
}

/**
 * Get end of day in PKT (23:59:59.999) as UTC Date
 * @param {string} dateString - YYYY-MM-DD format
 * @returns {Date}
 */
function endOfDayPKT(dateString = null) {
    const dateStr = dateString || getTodayDatePKT();
    // Parse as PKT time and convert to UTC
    const pktDate = new Date(`${dateStr}T23:59:59.999+05:00`);
    return pktDate;
}

/**
 * Get office start time for today in PKT as UTC Date
 * @returns {Date}
 */
function getOfficeStartTimePKT() {
    const [hh, mm] = (process.env.OFFICE_START_TIME || "09:00").split(":");
    const todayPKT = getTodayDatePKT();
    const hours = String(hh).padStart(2, '0');
    const minutes = String(mm).padStart(2, '0');
    // Create date in PKT timezone
    const officeStart = new Date(`${todayPKT}T${hours}:${minutes}:00.000+05:00`);
    return officeStart;
}

/**
 * Format date to PKT timezone string for display
 * @param {Date} date - UTC date
 * @returns {string}
 */
function formatDateTimePKT(date) {
    if (!date) return null;
    const pktDate = new Date(date.getTime() + PKT_OFFSET_MS);
    return pktDate.toISOString().replace('Z', '+05:00');
}

/**
 * Check if a date string is valid YYYY-MM-DD format
 * @param {string} dateString 
 * @returns {boolean}
 */
function isValidDateString(dateString) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
        return false;
    }
    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date);
}

/**
 * Parse date string (YYYY-MM-DD) to start of day UTC
 * @param {string} dateString 
 * @returns {Date}
 */
function parseDateString(dateString) {
    return new Date(`${dateString}T00:00:00.000Z`);
}

module.exports = {
    nowUTC,
    nowPKT,
    getTodayDatePKT,
    getDateStringPKT,
    startOfDayPKT,
    endOfDayPKT,
    getOfficeStartTimePKT,
    formatDateTimePKT,
    isValidDateString,
    parseDateString,
    PKT_OFFSET_MS
};