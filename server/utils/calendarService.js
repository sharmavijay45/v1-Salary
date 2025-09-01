import Holidays from 'date-holidays';
import moment from 'moment';

/**
 * Calendar service to handle government holidays and working days calculation
 * Supports Indian holidays by default but can be configured for other countries
 */
class CalendarService {
  constructor() {
    // Initialize for India (IN) - can be changed based on requirements
    this.hd = new Holidays('IN');
    this.country = 'IN';
    this.state = 'DL'; // Delhi - can be configured for different states
    
    // Cache for holidays to avoid repeated API calls
    this.holidayCache = new Map();
    
    console.log('Calendar service initialized for country:', this.country);
  }

  /**
   * Set country and state for holiday calculation
   * @param {string} country - Country code (e.g., 'IN', 'US', 'UK')
   * @param {string} state - State/region code (optional)
   */
  setLocation(country, state = null) {
    this.country = country;
    this.state = state;
    this.hd = new Holidays(country, state);
    this.holidayCache.clear(); // Clear cache when location changes
    console.log(`Calendar service location updated to: ${country}${state ? `, ${state}` : ''}`);
  }

  /**
   * Get all holidays for a specific year
   * @param {number} year - Year to get holidays for
   * @returns {Array} Array of holiday objects
   */
  getHolidaysForYear(year) {
    const cacheKey = `${this.country}-${this.state}-${year}`;
    
    if (this.holidayCache.has(cacheKey)) {
      return this.holidayCache.get(cacheKey);
    }

    try {
      const holidays = this.hd.getHolidays(year);
      
      // Format holidays for easier consumption
      const formattedHolidays = holidays.map(holiday => ({
        date: moment(holiday.date).format('YYYY-MM-DD'),
        name: holiday.name,
        type: holiday.type || 'public',
        substitute: holiday.substitute || false,
        start: holiday.start,
        end: holiday.end
      }));

      this.holidayCache.set(cacheKey, formattedHolidays);
      console.log(`Found ${formattedHolidays.length} holidays for year ${year}`);
      
      return formattedHolidays;
    } catch (error) {
      console.error('Error fetching holidays for year:', year, error);
      return [];
    }
  }

  /**
   * Get holidays for a specific month
   * @param {string} monthYear - Format: "YYYY-MM"
   * @returns {Array} Array of holiday objects for the month
   */
  getHolidaysForMonth(monthYear) {
    try {
      const year = parseInt(monthYear.split('-')[0]);
      const month = parseInt(monthYear.split('-')[1]);
      
      const allHolidays = this.getHolidaysForYear(year);
      
      // Filter holidays for the specific month
      const monthHolidays = allHolidays.filter(holiday => {
        const holidayDate = moment(holiday.date);
        return holidayDate.year() === year && holidayDate.month() + 1 === month;
      });

      console.log(`Found ${monthHolidays.length} holidays for ${monthYear}:`, 
        monthHolidays.map(h => `${h.date}: ${h.name}`));
      
      return monthHolidays;
    } catch (error) {
      console.error('Error fetching holidays for month:', monthYear, error);
      return [];
    }
  }

  /**
   * Check if a specific date is a holiday
   * @param {string} date - Date in format "YYYY-MM-DD"
   * @returns {Object|null} Holiday object if date is a holiday, null otherwise
   */
  isHoliday(date) {
    try {
      const dateObj = moment(date);
      const year = dateObj.year();
      const holidays = this.getHolidaysForYear(year);
      
      return holidays.find(holiday => holiday.date === date) || null;
    } catch (error) {
      console.error('Error checking if date is holiday:', date, error);
      return null;
    }
  }

  /**
   * Check if a specific date is a Sunday
   * @param {string} date - Date in format "YYYY-MM-DD"
   * @returns {boolean} True if the date is a Sunday
   */
  isSunday(date) {
    try {
      return moment(date).day() === 0;
    } catch (error) {
      console.error('Error checking if date is Sunday:', date, error);
      return false;
    }
  }

  /**
   * Check if a specific date is a weekend (Saturday or Sunday)
   * @param {string} date - Date in format "YYYY-MM-DD"
   * @returns {boolean} True if the date is a weekend
   */
  isWeekend(date) {
    try {
      const dayOfWeek = moment(date).day();
      return dayOfWeek === 0 || dayOfWeek === 6; // Sunday = 0, Saturday = 6
    } catch (error) {
      console.error('Error checking if date is weekend:', date, error);
      return false;
    }
  }

  /**
   * Get all Sundays in a month
   * @param {string} monthYear - Format: "YYYY-MM"
   * @returns {Array} Array of Sunday dates
   */
  getSundaysInMonth(monthYear) {
    try {
      const startOfMonth = moment(monthYear, 'YYYY-MM').startOf('month');
      const endOfMonth = moment(monthYear, 'YYYY-MM').endOf('month');
      
      const sundays = [];
      let currentDate = startOfMonth.clone();
      
      while (currentDate.isSameOrBefore(endOfMonth)) {
        if (currentDate.day() === 0) { // Sunday
          sundays.push(currentDate.format('YYYY-MM-DD'));
        }
        currentDate.add(1, 'day');
      }
      
      return sundays;
    } catch (error) {
      console.error('Error getting Sundays for month:', monthYear, error);
      return [];
    }
  }

  /**
   * Get all weekends in a month
   * @param {string} monthYear - Format: "YYYY-MM"
   * @returns {Array} Array of weekend dates
   */
  getWeekendsInMonth(monthYear) {
    try {
      const startOfMonth = moment(monthYear, 'YYYY-MM').startOf('month');
      const endOfMonth = moment(monthYear, 'YYYY-MM').endOf('month');
      
      const weekends = [];
      let currentDate = startOfMonth.clone();
      
      while (currentDate.isSameOrBefore(endOfMonth)) {
        if (currentDate.day() === 0 || currentDate.day() === 6) { // Sunday or Saturday
          weekends.push(currentDate.format('YYYY-MM-DD'));
        }
        currentDate.add(1, 'day');
      }
      
      return weekends;
    } catch (error) {
      console.error('Error getting weekends for month:', monthYear, error);
      return [];
    }
  }

  /**
   * Calculate working days in a month (excluding weekends and holidays)
   * @param {string} monthYear - Format: "YYYY-MM"
   * @param {boolean} excludeSaturdays - Whether to exclude Saturdays (default: true)
   * @returns {Object} Detailed working days calculation
   */
  getWorkingDaysInMonth(monthYear, excludeSaturdays = true) {
    try {
      const startOfMonth = moment(monthYear, 'YYYY-MM').startOf('month');
      const endOfMonth = moment(monthYear, 'YYYY-MM').endOf('month');
      const totalDays = endOfMonth.date();
      
      // Get holidays for this month
      const holidays = this.getHolidaysForMonth(monthYear);
      const holidayDates = new Set(holidays.map(h => h.date));
      
      let workingDays = 0;
      let weekends = 0;
      let holidayCount = 0;
      let sundayCount = 0;
      let saturdayCount = 0;
      
      const workingDaysList = [];
      const nonWorkingDays = [];
      
      let currentDate = startOfMonth.clone();
      
      while (currentDate.isSameOrBefore(endOfMonth)) {
        const dateStr = currentDate.format('YYYY-MM-DD');
        const dayOfWeek = currentDate.day();
        const isHoliday = holidayDates.has(dateStr);
        
        // Check if it's a working day
        let isWorkingDay = true;
        let reason = '';
        
        if (dayOfWeek === 0) { // Sunday
          isWorkingDay = false;
          reason = 'Sunday';
          weekends++;
          sundayCount++;
        } else if (excludeSaturdays && dayOfWeek === 6) { // Saturday
          isWorkingDay = false;
          reason = 'Saturday';
          weekends++;
          saturdayCount++;
        } else if (isHoliday) {
          isWorkingDay = false;
          const holiday = holidays.find(h => h.date === dateStr);
          reason = `Holiday: ${holiday.name}`;
          holidayCount++;
        }
        
        if (isWorkingDay) {
          workingDays++;
          workingDaysList.push(dateStr);
        } else {
          nonWorkingDays.push({
            date: dateStr,
            reason: reason,
            dayName: currentDate.format('dddd')
          });
        }
        
        currentDate.add(1, 'day');
      }
      
      // Calculate required working days (max 27 as per business rule)
      const requiredWorkingDays = Math.min(workingDays, 27);
      
      return {
        monthYear,
        totalDays,
        workingDays,
        requiredWorkingDays,
        weekends,
        holidayCount,
        sundayCount,
        saturdayCount,
        holidays: holidays,
        workingDaysList,
        nonWorkingDays,
        calculation: {
          totalDays,
          minusWeekends: totalDays - weekends,
          minusHolidays: totalDays - weekends - holidayCount,
          finalWorkingDays: workingDays
        }
      };
    } catch (error) {
      console.error('Error calculating working days for month:', monthYear, error);
      // Return fallback values
      return {
        monthYear,
        totalDays: 30,
        workingDays: 22,
        requiredWorkingDays: 22,
        weekends: 8,
        holidayCount: 0,
        sundayCount: 4,
        saturdayCount: 4,
        holidays: [],
        workingDaysList: [],
        nonWorkingDays: [],
        calculation: {
          totalDays: 30,
          minusWeekends: 22,
          minusHolidays: 22,
          finalWorkingDays: 22
        }
      };
    }
  }

  /**
   * Calculate salary based on dynamic working days and holidays
   * @param {number} hoursWorked - Total hours worked by employee
   * @param {number} daysPresent - Number of days employee was present
   * @param {string} monthYear - Format: "YYYY-MM"
   * @param {number} dailyWage - Daily wage rate (default: 258)
   * @param {number} baseSalary - Employee's base salary (default: 8000)
   * @returns {Object} Detailed salary calculation
   */
  calculateDynamicSalary(hoursWorked, daysPresent, monthYear, dailyWage = 258, baseSalary = 8000, holidays = null) {
    try {
      // Get working days info from calendar (include Saturdays, exclude only Sundays)
      const workingDaysInfo = this.getWorkingDaysInMonth(monthYear, false);
      
      if (holidays !== null && typeof holidays === 'number') {
        workingDaysInfo.workingDays -= holidays;
        workingDaysInfo.holidayCount += holidays;
      }

      const requiredDays = workingDaysInfo.requiredWorkingDays;
      
      // Calculate expected hours (8 hours per working day)
      const expectedHoursPerDay = 8;
      const expectedTotalHours = requiredDays * expectedHoursPerDay;

      // Calculate effective days present by dividing total hours by expected daily hours
      const effectiveDaysPresent = hoursWorked / expectedHoursPerDay;

      // Determine salary calculation method based on employee's base salary
      let calculatedSalary;
      let calculationMethod;
      
      if (baseSalary > 8000) {
        // For employees with higher base salary, use proportional calculation
        calculationMethod = 'proportional';
        const attendanceRatio = Math.min(effectiveDaysPresent / requiredDays, 1);
        calculatedSalary = Math.round(baseSalary * attendanceRatio);
      } else {
        // For standard employees, use daily wage calculation
        calculationMethod = 'daily_wage';
        calculatedSalary = Math.round(effectiveDaysPresent * dailyWage);
      }

      // Calculate percentages
      const attendancePercentage = (effectiveDaysPresent / requiredDays) * 100;
      const hoursPercentage = (hoursWorked / expectedTotalHours) * 100;

      // Calculate daily and monthly hour averages
      const avgHoursPerDay = effectiveDaysPresent > 0 ? hoursWorked / effectiveDaysPresent : 0;
      const avgHoursPerMonth = hoursWorked;

      return {
        // Calendar and working days info
        workingDaysInfo,
        requiredDays,
        
        // Attendance data
        daysPresent: Math.round(effectiveDaysPresent * 100) / 100,
        hoursWorked: Math.round(hoursWorked * 100) / 100,
        expectedTotalHours,
        avgHoursPerDay: Math.round(avgHoursPerDay * 100) / 100,
        avgHoursPerMonth: Math.round(avgHoursPerMonth * 100) / 100,
        
        // Salary calculation
        dailyWage,
        baseSalary,
        calculationMethod,
        calculatedSalary: Math.max(0, calculatedSalary),
        adjustedSalary: Math.max(0, calculatedSalary),
        
        // Percentages
        attendancePercentage: Math.round(attendancePercentage * 100) / 100,
        hoursPercentage: Math.round(hoursPercentage * 100) / 100,
        salaryPercentage: Math.round(attendancePercentage * 100) / 100,
        
        // Detailed breakdown for UI display
        salaryBreakdown: {
          baseSalary,
          workingDaysInMonth: workingDaysInfo.workingDays,
          requiredWorkingDays: requiredDays,
          daysWorked: effectiveDaysPresent,
          hoursWorked,
          expectedHours: expectedTotalHours,
          dailyRate: calculationMethod === 'daily_wage' ? dailyWage : Math.round(baseSalary / requiredDays),
          calculationFormula: calculationMethod === 'daily_wage' 
            ? `${effectiveDaysPresent} days × ₹${dailyWage} = ₹${calculatedSalary}`
            : `₹${baseSalary} × (${effectiveDaysPresent}/${requiredDays}) = ₹${calculatedSalary}`,
          holidays: workingDaysInfo.holidays,
          nonWorkingDays: workingDaysInfo.nonWorkingDays
        }
      };
    } catch (error) {
      console.error('Error calculating dynamic salary:', error);
      
      // Fallback calculation
      const requiredDays = 27;
      const expectedTotalHours = requiredDays * 8;
      const effectiveDaysPresent = hoursWorked / 8;
      const calculatedSalary = Math.round(effectiveDaysPresent * dailyWage);
      const avgHoursPerDay = effectiveDaysPresent > 0 ? hoursWorked / effectiveDaysPresent : 0;

      return {
        workingDaysInfo: { workingDays: 27, requiredWorkingDays: 27, holidays: [], nonWorkingDays: [] },
        requiredDays,
        daysPresent: Math.round(effectiveDaysPresent * 100) / 100,
        hoursWorked: Math.round(hoursWorked * 100) / 100,
        expectedTotalHours,
        avgHoursPerDay: Math.round(avgHoursPerDay * 100) / 100,
        avgHoursPerMonth: Math.round(hoursWorked * 100) / 100,
        dailyWage,
        baseSalary,
        calculationMethod: 'daily_wage',
        calculatedSalary: Math.max(0, calculatedSalary),
        adjustedSalary: Math.max(0, calculatedSalary),
        attendancePercentage: (effectiveDaysPresent / requiredDays) * 100,
        hoursPercentage: (hoursWorked / expectedTotalHours) * 100,
        salaryPercentage: (effectiveDaysPresent / requiredDays) * 100,
        salaryBreakdown: {
          baseSalary,
          workingDaysInMonth: 27,
          requiredWorkingDays: requiredDays,
          daysWorked: effectiveDaysPresent,
          hoursWorked,
          expectedHours: expectedTotalHours,
          dailyRate: dailyWage,
          calculationFormula: `${effectiveDaysPresent} days × ₹${dailyWage} = ₹${calculatedSalary}`,
          holidays: [],
          nonWorkingDays: []
        }
      };
    }
  }

  /**
   * Get upcoming holidays in the next N days
   * @param {number} days - Number of days to look ahead (default: 30)
   * @returns {Array} Array of upcoming holidays
   */
  getUpcomingHolidays(days = 30) {
    try {
      const today = moment();
      const endDate = moment().add(days, 'days');
      
      const currentYear = today.year();
      const endYear = endDate.year();
      
      let allHolidays = this.getHolidaysForYear(currentYear);
      
      // If the date range spans multiple years, get holidays for both years
      if (endYear > currentYear) {
        allHolidays = [...allHolidays, ...this.getHolidaysForYear(endYear)];
      }
      
      // Filter holidays within the date range
      const upcomingHolidays = allHolidays.filter(holiday => {
        const holidayDate = moment(holiday.date);
        return holidayDate.isBetween(today, endDate, 'day', '[]');
      });
      
      // Sort by date
      upcomingHolidays.sort((a, b) => moment(a.date).diff(moment(b.date)));
      
      return upcomingHolidays;
    } catch (error) {
      console.error('Error fetching upcoming holidays:', error);
      return [];
    }
  }

  /**
   * Clear the holiday cache (useful for testing or when data needs to be refreshed)
   */
  clearCache() {
    this.holidayCache.clear();
    console.log('Holiday cache cleared');
  }
}

// Create and export a singleton instance
const calendarService = new CalendarService();

export default calendarService;

// Export individual functions for backward compatibility
export const getWorkingDaysInMonth = (monthYear) => calendarService.getWorkingDaysInMonth(monthYear);
export const getHolidaysForMonth = (monthYear) => calendarService.getHolidaysForMonth(monthYear);
export const calculateDynamicSalary = (hoursWorked, daysPresent, monthYear, dailyWage, baseSalary, holidays) => 
  calendarService.calculateDynamicSalary(hoursWorked, daysPresent, monthYear, dailyWage, baseSalary, holidays);
export const getSundaysInMonth = (monthYear) => calendarService.getSundaysInMonth(monthYear);
export const isHoliday = (date) => calendarService.isHoliday(date);
export const isSunday = (date) => calendarService.isSunday(date);
export const isWeekend = (date) => calendarService.isWeekend(date);