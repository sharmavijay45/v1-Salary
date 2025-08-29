import express from 'express';
import auth from '../middleware/auth.js';
import calendarService from '../utils/calendarService.js';
import moment from 'moment';

const router = express.Router();

/**
 * Get holidays for a specific year
 * GET /api/calendar/holidays/:year
 */
router.get('/holidays/:year', auth, async (req, res) => {
  try {
    const { year } = req.params;
    
    // Validate year
    const yearNum = parseInt(year);
    if (isNaN(yearNum) || yearNum < 2020 || yearNum > 2030) {
      return res.status(400).json({ 
        message: 'Invalid year. Year must be between 2020 and 2030' 
      });
    }

    const holidays = calendarService.getHolidaysForYear(yearNum);
    
    res.json({
      success: true,
      year: yearNum,
      count: holidays.length,
      holidays
    });
  } catch (err) {
    console.error('Get holidays error:', err);
    res.status(500).json({ 
      message: 'Error fetching holidays',
      error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
    });
  }
});

/**
 * Get holidays for a specific month
 * GET /api/calendar/holidays/month/:monthYear
 */
router.get('/holidays/month/:monthYear', auth, async (req, res) => {
  try {
    const { monthYear } = req.params;
    
    // Validate monthYear format
    if (!/^\d{4}-\d{2}$/.test(monthYear)) {
      return res.status(400).json({ 
        message: 'Invalid month format. Use YYYY-MM (e.g., 2025-01)' 
      });
    }

    const holidays = calendarService.getHolidaysForMonth(monthYear);
    
    res.json({
      success: true,
      monthYear,
      count: holidays.length,
      holidays
    });
  } catch (err) {
    console.error('Get month holidays error:', err);
    res.status(500).json({ 
      message: 'Error fetching month holidays',
      error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
    });
  }
});

/**
 * Get working days information for a specific month
 * GET /api/calendar/working-days/:monthYear
 */
router.get('/working-days/:monthYear', auth, async (req, res) => {
  try {
    const { monthYear } = req.params;
    
    // Validate monthYear format
    if (!/^\d{4}-\d{2}$/.test(monthYear)) {
      return res.status(400).json({ 
        message: 'Invalid month format. Use YYYY-MM (e.g., 2025-01)' 
      });
    }

    const workingDaysInfo = calendarService.getWorkingDaysInMonth(monthYear, false);
    
    res.json({
      success: true,
      ...workingDaysInfo
    });
  } catch (err) {
    console.error('Get working days error:', err);
    res.status(500).json({ 
      message: 'Error fetching working days information',
      error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
    });
  }
});

/**
 * Get working days information for current month
 * GET /api/calendar/working-days/current
 */
router.get('/working-days/current', auth, async (req, res) => {
  try {
    const currentMonth = moment().format('YYYY-MM');
    const workingDaysInfo = calendarService.getWorkingDaysInMonth(currentMonth, false);
    
    res.json({
      success: true,
      ...workingDaysInfo
    });
  } catch (err) {
    console.error('Get current working days error:', err);
    res.status(500).json({ 
      message: 'Error fetching current month working days',
      error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
    });
  }
});

/**
 * Check if a specific date is a holiday
 * GET /api/calendar/check-holiday/:date
 */
router.get('/check-holiday/:date', auth, async (req, res) => {
  try {
    const { date } = req.params;
    
    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ 
        message: 'Invalid date format. Use YYYY-MM-DD (e.g., 2025-01-15)' 
      });
    }

    const holiday = calendarService.isHoliday(date);
    const isSunday = calendarService.isSunday(date);
    const isWeekend = calendarService.isWeekend(date);
    
    res.json({
      success: true,
      date,
      isHoliday: !!holiday,
      holidayInfo: holiday,
      isSunday,
      isWeekend,
      isWorkingDay: !holiday && !isSunday // Only exclude Sundays, not Saturdays
    });
  } catch (err) {
    console.error('Check holiday error:', err);
    res.status(500).json({ 
      message: 'Error checking holiday status',
      error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
    });
  }
});

/**
 * Get upcoming holidays in the next N days
 * GET /api/calendar/upcoming-holidays?days=30
 */
router.get('/upcoming-holidays', auth, async (req, res) => {
  try {
    const { days = 30 } = req.query;
    
    // Validate days parameter
    const daysNum = parseInt(days);
    if (isNaN(daysNum) || daysNum < 1 || daysNum > 365) {
      return res.status(400).json({ 
        message: 'Invalid days parameter. Must be between 1 and 365' 
      });
    }

    const upcomingHolidays = calendarService.getUpcomingHolidays(daysNum);
    
    res.json({
      success: true,
      days: daysNum,
      count: upcomingHolidays.length,
      holidays: upcomingHolidays
    });
  } catch (err) {
    console.error('Get upcoming holidays error:', err);
    res.status(500).json({ 
      message: 'Error fetching upcoming holidays',
      error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
    });
  }
});

/**
 * Calculate salary with dynamic working days for testing purposes (Admin only)
 * POST /api/calendar/calculate-salary
 */
router.post('/calculate-salary', auth, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const { 
      hoursWorked, 
      daysPresent, 
      monthYear, 
      dailyWage = 258, 
      baseSalary = 8000 
    } = req.body;

    // Validate required fields
    if (!hoursWorked || !daysPresent || !monthYear) {
      return res.status(400).json({ 
        message: 'Missing required fields: hoursWorked, daysPresent, monthYear' 
      });
    }

    // Validate monthYear format
    if (!/^\d{4}-\d{2}$/.test(monthYear)) {
      return res.status(400).json({ 
        message: 'Invalid month format. Use YYYY-MM (e.g., 2025-01)' 
      });
    }

    const salaryCalculation = calendarService.calculateDynamicSalary(
      parseFloat(hoursWorked),
      parseFloat(daysPresent),
      monthYear,
      parseFloat(dailyWage),
      parseFloat(baseSalary)
    );
    
    res.json({
      success: true,
      calculation: salaryCalculation
    });
  } catch (err) {
    console.error('Calculate salary error:', err);
    res.status(500).json({ 
      message: 'Error calculating salary',
      error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
    });
  }
});

/**
 * Get calendar settings and configuration
 * GET /api/calendar/settings
 */
router.get('/settings', auth, async (req, res) => {
  try {
    res.json({
      success: true,
      settings: {
        country: calendarService.country,
        state: calendarService.state,
        defaultDailyWage: parseInt(process.env.DAILY_WAGE) || 258,
        defaultBaseSalary: parseInt(process.env.DEFAULT_SALARY) || 8000,
        requiredDaysPerMonth: parseInt(process.env.REQUIRED_DAYS_PER_MONTH) || 27,
        expectedHoursPerDay: 8,
        workingDaysPerWeek: 6, // Monday to Saturday
        excludeSaturdays: false // Saturdays are now included as working days
      }
    });
  } catch (err) {
    console.error('Get calendar settings error:', err);
    res.status(500).json({ 
      message: 'Error fetching calendar settings',
      error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
    });
  }
});

/**
 * Update calendar settings (Admin only)
 * PUT /api/calendar/settings
 */
router.put('/settings', auth, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const { country, state } = req.body;

    if (country) {
      calendarService.setLocation(country, state);
      console.log(`Calendar location updated to: ${country}${state ? `, ${state}` : ''}`);
    }

    res.json({
      success: true,
      message: 'Calendar settings updated successfully',
      settings: {
        country: calendarService.country,
        state: calendarService.state
      }
    });
  } catch (err) {
    console.error('Update calendar settings error:', err);
    res.status(500).json({ 
      message: 'Error updating calendar settings',
      error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
    });
  }
});

/**
 * Clear calendar cache (Admin only)
 * POST /api/calendar/clear-cache
 */
router.post('/clear-cache', auth, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    calendarService.clearCache();
    
    res.json({
      success: true,
      message: 'Calendar cache cleared successfully'
    });
  } catch (err) {
    console.error('Clear cache error:', err);
    res.status(500).json({ 
      message: 'Error clearing calendar cache',
      error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
    });
  }
});

export default router;