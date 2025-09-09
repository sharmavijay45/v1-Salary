import axios from 'axios';

axios.defaults.baseURL = `${import.meta.env.REACT_BASE_URL}`;

export const login = async (credentials) => {
  const response = await axios.post('/auth/login', credentials);
  return response.data;
};

export const checkAdminExists = async () => {
  const response = await axios.get('/auth/check-admin');
  return response.data;
};

export const createAdmin = async (adminData) => {
  const response = await axios.post('/auth/create-admin', adminData);
  return response.data;
};

export const uploadAttendance = async (formData) => {
  const response = await axios.post('/attendance/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data', Authorization: `Bearer ${localStorage.getItem('token')}` }
  });
  return response.data;
};

export const getAttendance = async () => {
  const response = await axios.get('/attendance', {
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
  });
  return response.data;
};

export const exposeAttendance = async (id) => {
  const response = await axios.put(`/attendance/expose/${id}`, {}, {
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
  });
  return response.data;
};

export const adjustSalary = async (id, adjustedSalary) => {
  const response = await axios.put(`/attendance/adjust/${id}`, { adjustedSalary }, {
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
  });
  return response.data;
};

export const getUserAttendance = async (userId) => {
  const response = await axios.get(`/attendance/user/${userId}`, {
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
  });
  return response.data;
};

export const getWorkingDays = async (monthYear = null) => {
  const url = monthYear ? `/attendance/working-days/${monthYear}` : '/attendance/working-days';
  const response = await axios.get(url, {
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
  });
  return response.data;
};

export const getUnexposedUsers = async (monthYear = null) => {
  const url = monthYear ? `/attendance/unexposed?monthYear=${monthYear}` : '/attendance/unexposed';
  const response = await axios.get(url, {
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
  });
  return response.data;
};

export const exposeAllCurrentMonth = async () => {
  const response = await axios.put('/attendance/expose-all-current', {}, {
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
  });
  return response.data;
};

export const submitFeedback = async (feedback) => {
  const response = await axios.post('/feedback', feedback, {
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
  });
  return response.data;
};

export const getFeedbacks = async () => {
  const response = await axios.get('/feedback', {
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
  });
  return response.data;
};

export const downloadReport = async (monthYear, format = 'csv') => {
  const response = await axios.get('/attendance/download', {
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
    params: { monthYear, format },
    responseType: 'blob'
  });
  return response.data;
};

export const exposeAllAttendance = async (monthYear, userIds) => {
  const response = await axios.put('/attendance/expose-all',
    { monthYear, userIds },
    {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    }
  );
  return response.data;
};

export const migrateUsers = async (forceUpdate = false) => {
  const response = await axios.post('/migration/migrate-users',
    { forceUpdate },
    {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    }
  );
  return response.data;
};

export const syncUser = async (email) => {
  const response = await axios.post('/migration/sync-user',
    { email },
    {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    }
  );
  return response.data;
};

export const respondToFeedback = async (feedbackId, adminResponse, status = 'reviewed') => {
  const response = await axios.put(`/feedback/respond/${feedbackId}`,
    { adminResponse, status },
    {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    }
  );
  return response.data;
};

export const updateFeedbackStatus = async (feedbackId, status) => {
  const response = await axios.put(`/feedback/status/${feedbackId}`,
    { status },
    {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    }
  );
  return response.data;
};

export const getFeedbackStats = async () => {
  const response = await axios.get('/feedback/stats', {
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
  });
  return response.data;
};

export const getDailyStats = async (monthYear = null) => {
  const url = monthYear ? `/attendance/daily-stats/${monthYear}` : '/attendance/daily-stats';
  const response = await axios.get(url, {
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
  });
  return response.data;
};

export const getDuplicatesSummary = async () => {
  const response = await axios.get('/attendance/duplicates/summary', {
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
  });
  return response.data;
};

export const removeDuplicates = async () => {
  const response = await axios.post('/attendance/duplicates/remove', {}, {
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
  });
  return response.data;
};

// Calendar API functions
export const getHolidaysForYear = async (year) => {
  const response = await axios.get(`/calendar/holidays/${year}`, {
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
  });
  return response.data;
};

export const getHolidaysForMonth = async (monthYear) => {
  const response = await axios.get(`/calendar/holidays/month/${monthYear}`, {
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
  });
  return response.data;
};

export const getCalendarWorkingDays = async (monthYear) => {
  const response = await axios.get(`/calendar/working-days/${monthYear}`, {
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
  });
  return response.data;
};

export const getCurrentWorkingDays = async () => {
  const response = await axios.get('/calendar/working-days/current', {
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
  });
  return response.data;
};

export const checkHoliday = async (date) => {
  const response = await axios.get(`/calendar/check-holiday/${date}`, {
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
  });
  return response.data;
};

export const getUpcomingHolidays = async (days = 30) => {
  const response = await axios.get(`/calendar/upcoming-holidays?days=${days}`, {
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
  });
  return response.data;
};

export const calculateSalaryWithCalendar = async (salaryData) => {
  const response = await axios.post('/calendar/calculate-salary', salaryData, {
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
  });
  return response.data;
};

export const getCalendarSettings = async () => {
  const response = await axios.get('/calendar/settings', {
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
  });
  return response.data;
};

export const updateCalendarSettings = async (settings) => {
  const response = await axios.put('/calendar/settings', settings, {
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
  });
  return response.data;
};

export const clearCalendarCache = async () => {
  const response = await axios.post('/calendar/clear-cache', {}, {
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
  });
  return response.data;
};

// Holiday Management APIs
export const addHolidays = async (holidays, monthYear) => {
  const response = await axios.post('/attendance/holidays', 
    { holidays, monthYear },
    {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    }
  );
  return response.data;
};

export const getHolidays = async (monthYear) => {
  const response = await axios.get(`/attendance/holidays/${monthYear}`, {
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
  });
  return response.data;
};

export const updateHoliday = async (holidayId, holidayData) => {
  const response = await axios.put(`/attendance/holidays/${holidayId}`, holidayData, {
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
  });
  return response.data;
};

export const deleteHoliday = async (holidayId) => {
  const response = await axios.delete(`/attendance/holidays/${holidayId}`, {
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
  });
  return response.data;
};

// Settings API functions
export const getSettings = async () => {
  const response = await axios.get('/settings', {
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
  });
  return response.data;
};

export const updateSettings = async (settings) => {
  const response = await axios.put('/settings', settings, {
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
  });
  return response.data;
};

export const resetSettings = async () => {
  const response = await axios.post('/settings/reset', {}, {
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
  });
  return response.data;
};

export const getSystemStats = async () => {
  const response = await axios.get('/settings/stats', {
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
  });
  return response.data;
};

export const backupSettings = async () => {
  const response = await axios.post('/settings/backup', {}, {
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
  });
  return response.data;
};

export const restoreSettings = async (backup) => {
  const response = await axios.post('/settings/restore', { backup }, {
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
  });
  return response.data;
};

export const updateUserSalary = async (userId, salaryData) => {
  const response = await axios.put(`/settings/user-salary/${userId}`, salaryData, {
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
  });
  return response.data;
};

export const bulkUpdateSalaries = async (updates) => {
  const response = await axios.put('/settings/bulk-salary-update', { updates }, {
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
  });
  return response.data;
};

// Salary Increase/Decrease APIs
export const increaseSalary = async (attendanceId, amount, reason) => {
  const response = await axios.put(`/attendance/salary-increase/${attendanceId}`, 
    { amount, reason },
    {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    }
  );
  return response.data;
};

export const decreaseSalary = async (attendanceId, amount, reason) => {
  const response = await axios.put(`/attendance/salary-decrease/${attendanceId}`, 
    { amount, reason },
    {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    }
  );
  return response.data;
};