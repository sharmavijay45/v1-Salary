import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { uploadAttendance, getAttendance, exposeAttendance, adjustSalary, getFeedbacks, downloadReport, exposeAllAttendance, migrateUsers, syncUser, respondToFeedback, updateFeedbackStatus, getDuplicatesSummary, removeDuplicates, getCalendarWorkingDays, getHolidaysForMonth, getCurrentWorkingDays, getSettings, updateSettings, resetSettings, getSystemStats, updateUserSalary, bulkUpdateSalaries, increaseSalary, decreaseSalary } from '../api';
import SalaryExplanationModal from './SalaryExplanationModal';
import HolidayInputModal from './HolidayInputModal';
import HolidayManager from './HolidayManager';
import SettingsTab from './SettingsTab';
import SalaryAdjustmentModal from './SalaryAdjustmentModal';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload, Users, BarChart3, MessageSquare, Settings,
  Download, Eye, EyeOff, DollarSign, Calendar,
  TrendingUp, AlertCircle, CheckCircle, Clock,
  FileSpreadsheet, Database, RefreshCw, X, Calculator
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

function AdminDashboard() {
  const [attendanceData, setAttendanceData] = useState([]);
  const [feedbacks, setFeedbacks] = useState([]);
  const [insights, setInsights] = useState('');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [migrating, setMigrating] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [adjustingUser, setAdjustingUser] = useState(null);
  const [adjustmentAmount, setAdjustmentAmount] = useState('');
  const [adjustmentReason, setAdjustmentReason] = useState('');
  const [currentMonthYear, setCurrentMonthYear] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [selectedFeedback, setSelectedFeedback] = useState(null);
  const [adminResponse, setAdminResponse] = useState('');
  const [showSalaryModal, setShowSalaryModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [stats, setStats] = useState({
    totalEmployees: 0,
    avgAttendance: 0,
    totalSalary: 0,
    exposedCount: 0
  });
  const [workingDaysInfo, setWorkingDaysInfo] = useState(null);
  const [holidaysThisMonth, setHolidaysThisMonth] = useState([]);
  const [showHolidayModal, setShowHolidayModal] = useState(false); // Keep for HolidayManager
  // New state for file uploads and month selection
  const [excelFile, setExcelFile] = useState(null);
  const [attendanceFile, setAttendanceFile] = useState(null);
  const [selectedMonthYear, setSelectedMonthYear] = useState('');
  const [uploadedFile, setUploadedFile] = useState(null);
  const [totalHolidays, setTotalHolidays] = useState(0);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [settings, setSettings] = useState(null);
  const [systemStats, setSystemStats] = useState(null);
  const [settingsLoading, setSettingsLoading] = useState(false);

  useEffect(() => {
    fetchData();
    // Set default monthYear to current month
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    setSelectedMonthYear(`${year}-${month}`);
  }, []);


  console.log(attendanceData)
  const fetchData = async () => {
    try {
      setLoading(true);
      const data = await getAttendance();
      setAttendanceData(data);
      const feedbackData = await getFeedbacks();
      setFeedbacks(feedbackData);

      // Calculate statistics
      if (data.length > 0) {
        const totalEmployees = data.length;
        const avgAttendance = data.reduce((sum, emp) => sum + emp.daysPresent, 0) / totalEmployees;
        const totalSalary = data.reduce((sum, emp) => sum + emp.adjustedSalary, 0);
        const exposedCount = data.filter(emp => emp.exposed).length;

        setStats({
          totalEmployees,
          avgAttendance: Math.round(avgAttendance * 10) / 10,
          totalSalary,
          exposedCount
        });

        if (data[0]?.monthYear) {
          setCurrentMonthYear(data[0].monthYear);
          
          // Fetch calendar information for the current month
          try {
            const workingDays = await getCalendarWorkingDays(data[0].monthYear);
            setWorkingDaysInfo(workingDays);
            
            const holidays = await getHolidaysForMonth(data[0].monthYear);
            setHolidaysThisMonth(holidays.holidays || []);
          } catch (calendarError) {
            console.warn('Calendar data not available:', calendarError);
            // Fallback to current month if specific month fails
            try {
              const currentWorkingDays = await getCurrentWorkingDays();
              setWorkingDaysInfo(currentWorkingDays);
            } catch (fallbackError) {
              console.warn('Current working days not available:', fallbackError);
            }
          }
        }

        // Extract AI insights if available
        const insightsText = data.find(emp => emp.aiInsights)?.aiInsights || '';
        setInsights(insightsText);
      }
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Handle holiday input submission
  const handleHolidaySubmit = async (holidays, monthYear) => {
    setTotalHolidays(holidays);
    setSelectedMonthYear(monthYear);
    setShowUploadModal(true);
  };

  // New function to handle file processing
  const handleProcessFiles = async () => {
    if (!excelFile || !attendanceFile || !selectedMonthYear) {
      toast.error('Please select both Excel and Attendance files, and a month/year.');
      return;
    }

    const formData = new FormData();
    formData.append('excelFile', excelFile);
    formData.append('attendanceFile', attendanceFile);
    formData.append('monthYear', selectedMonthYear);
    formData.append('totalHolidays', totalHolidays);

    try {
      setUploading(true);
      const response = await uploadAttendance(formData);
      setInsights(response.insights || '');
      setCurrentMonthYear(response.monthYear || '');
      await fetchData();
      toast.success('Files uploaded and processed successfully!');
      setShowUploadModal(false);
      setExcelFile(null);
      setAttendanceFile(null);
      setTotalHolidays(0);
    } catch (err) {
      console.error('Upload error:', err);
      toast.error('Error uploading files: ' + (err.response?.data?.message || err.message));
    } finally {
      setUploading(false);
    }
  };

  const handleMigrateUsers = async () => {
    try {
      setMigrating(true);
      const result = await migrateUsers(false);
      toast.success(`Migration completed! Created: ${result.result.created}, Updated: ${result.result.updated}, Skipped: ${result.result.skipped}`, {
        duration: 5000,
      });
      await fetchData(); // Refresh data after migration
    } catch (err) {
      console.error('Migration error:', err);
      toast.error('Error migrating users: ' + (err.response?.data?.message || err.message));
    } finally {
      setMigrating(false);
    }
  };

  const handleSyncUser = async (email) => {
    try {
      const result = await syncUser(email);
      toast.success(`User ${result.result.action} successfully: ${email}`, {
        duration: 4000,
      });
      await fetchData(); // Refresh data after sync
    } catch (err) {
      console.error('Sync error:', err);
      toast.error('Error syncing user: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleExposeSelected = async () => {
    if (selectedUsers.length === 0) {
      toast.error('Please select users to expose');
      return;
    }

    try {
      await exposeAllAttendance(currentMonthYear, selectedUsers);
      await fetchData();
      setSelectedUsers([]);
      toast.success('Selected users exposed successfully!');
    } catch (err) {
      console.error('Expose error:', err);
      toast.error('Error exposing users: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleAdjustSalary = async () => {
    if (!adjustingUser || !adjustmentAmount) return;

    try {
      await adjustSalary(adjustingUser._id, {
        adjustedSalary: parseFloat(adjustmentAmount),
        reason: adjustmentReason
      });

      setAttendanceData(prev =>
        prev.map(user =>
          user._id === adjustingUser._id
            ? { ...user, adjustedSalary: parseFloat(adjustmentAmount) }
            : user
        )
      );

      setShowAdjustModal(false);
      setAdjustingUser(null);
      toast.success('Salary adjusted successfully!');
    } catch (err) {
      console.error('Salary adjustment error:', err);
      toast.error('Error adjusting salary: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleDownload = async () => {
    try {
      const blob = await downloadReport(currentMonthYear);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `salary_report_${currentMonthYear}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Report downloaded successfully!');
    } catch (err) {
      console.error('Download error:', err);
      toast.error('Error downloading report: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleFeedbackResponse = async () => {
    if (!selectedFeedback || !adminResponse.trim()) return;

    try {
      await respondToFeedback(selectedFeedback._id, adminResponse, 'reviewed');
      await fetchData(); // Refresh feedback data
      setShowFeedbackModal(false);
      setSelectedFeedback(null);
      setAdminResponse('');
      toast.success('Response sent successfully!');
    } catch (err) {
      console.error('Feedback response error:', err);
      toast.error('Error sending response: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleStatusUpdate = async (feedbackId, newStatus) => {
    try {
      await updateFeedbackStatus(feedbackId, newStatus);
      await fetchData(); // Refresh feedback data
      toast.success('Status updated successfully!');
    } catch (err) {
      console.error('Status update error:', err);
      toast.error('Error updating status: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleRemoveDuplicates = async () => {
    // Create a custom confirmation toast
    const confirmToast = toast((t) => (
      <div className="flex flex-col space-y-3">
        <div className="text-sm font-medium text-gray-900">
          Remove Duplicate Users
        </div>
        <div className="text-sm text-gray-600">
          Are you sure you want to remove duplicate users? This action cannot be undone.
        </div>
        <div className="flex space-x-2">
          <button
            onClick={async () => {
              toast.dismiss(t.id);
              try {
                setLoading(true);
                const result = await removeDuplicates();
                toast.success(`Deduplication completed! Removed ${result.removed} duplicates, kept ${result.kept} unique users.`);
                fetchData(); // Refresh data
              } catch (err) {
                console.error('Remove duplicates error:', err);
                toast.error('Error removing duplicates: ' + (err.response?.data?.message || err.message));
              } finally {
                setLoading(false);
              }
            }}
            className="px-3 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600"
          >
            Yes, Remove
          </button>
          <button
            onClick={() => toast.dismiss(t.id)}
            className="px-3 py-1 bg-gray-300 text-gray-700 text-xs rounded hover:bg-gray-400"
          >
            Cancel
          </button>
        </div>
      </div>
    ), {
      duration: 10000,
      position: 'top-center',
    });
  };

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 to-indigo-100 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="relative">
            <div className="animate-spin rounded-full h-32 w-32 border-4 border-primary-200 border-t-primary-600 mx-auto"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <BarChart3 className="w-8 h-8 text-primary-600" />
            </div>
          </div>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-6 text-lg text-secondary-600 font-medium"
          >
            Loading dashboard...
          </motion.p>
        </motion.div>
      </div>
    );
  }

  return (
    <>
      <Toaster position="top-right" />
      <div className="min-h-screen bg-gradient-to-br from-primary-50 via-indigo-50 to-purple-50">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/80 backdrop-blur-lg shadow-large border-b border-white/20"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-6">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
              >
                <h1 className="text-3xl font-bold text-gradient">Admin Dashboard</h1>
                <p className="text-secondary-600 mt-1">Manage attendance and salary calculations</p>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="flex items-center space-x-4"
              >
                {currentMonthYear && (
                  <div className="flex items-center space-x-2 bg-primary-100 text-primary-700 px-3 py-2 rounded-lg">
                    <Calendar className="w-4 h-4" />
                    <span className="text-sm font-medium">Period: {currentMonthYear}</span>
                  </div>
                )}
                <button
                  onClick={() => {
                    toast.success('Logged out successfully');
                    setTimeout(() => {
                      localStorage.removeItem('token');
                      localStorage.removeItem('user');
                      window.location.href = '/';
                    }, 1000);
                  }}
                  className="btn-danger flex items-center space-x-2"
                >
                  <X className="w-4 h-4" />
                  <span>Logout</span>
                </button>
              </motion.div>
            </div>
          </div>
        </motion.div>

        {/* Navigation Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6"
        >
          <div className="bg-white/80 backdrop-blur-lg rounded-xl shadow-medium border border-white/20">
            <div className="flex border-b border-gray-200/50">
              {[
                { id: 'overview', name: 'Overview', icon: BarChart3 },
                { id: 'upload', name: 'Upload Data', icon: Upload },
                { id: 'employees', name: 'Employees', icon: Users },
                { id: 'feedback', name: 'Feedback', icon: MessageSquare },
                { id: 'settings', name: 'Settings', icon: Settings }
              ].map((tab) => {
                const IconComponent = tab.icon;
                return (
                  <motion.button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={`flex items-center px-6 py-4 text-sm font-medium transition-all duration-200 ${
                      activeTab === tab.id
                        ? 'border-b-2 border-primary-500 text-primary-600 bg-primary-50'
                        : 'text-secondary-500 hover:text-secondary-700 hover:bg-secondary-50'
                    }`}
                  >
                    <IconComponent className="w-4 h-4 mr-2" />
                    {tab.name}
                  </motion.button>
                );
              })}
            </div>
          </div>
        </motion.div>

        {/* Content Area */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6 pb-12">
          {activeTab === 'overview' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="space-y-6"
            >
              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="card hover:shadow-glow transition-all duration-300"
                >
                  <div className="flex items-center">
                    <div className="p-3 bg-primary-100 rounded-xl">
                      <Users className="w-6 h-6 text-primary-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-secondary-600">Total Employees</p>
                      <p className="text-2xl font-bold text-secondary-900">{stats.totalEmployees}</p>
                    </div>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                  className="card hover:shadow-glow transition-all duration-300"
                >
                  <div className="flex items-center">
                    <div className="p-3 bg-success-100 rounded-xl">
                      <TrendingUp className="w-6 h-6 text-success-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-secondary-600">Avg Attendance</p>
                      <p className="text-2xl font-bold text-secondary-900">{stats.avgAttendance} days</p>
                    </div>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7 }}
                  className="card hover:shadow-glow transition-all duration-300"
                >
                  <div className="flex items-center">
                    <div className="p-3 bg-warning-100 rounded-xl">
                      <DollarSign className="w-6 h-6 text-warning-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-secondary-600">Total Salary</p>
                      <p className="text-2xl font-bold text-secondary-900">₹{stats.totalSalary.toLocaleString()}</p>
                    </div>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8 }}
                  className="card hover:shadow-glow transition-all duration-300"
                >
                  <div className="flex items-center">
                    <div className="p-3 bg-purple-100 rounded-xl">
                      <Eye className="w-6 h-6 text-purple-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-secondary-600">Exposed to Users</p>
                      <p className="text-2xl font-bold text-secondary-900">{stats.exposedCount}</p>
                    </div>
                  </div>
                </motion.div>
              </div>

              {/* Calendar-Based Working Days Information */}
              {workingDaysInfo && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.9 }}
                  className="card"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <Calendar className="w-6 h-6 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">Working Days Calculation</h3>
                        <p className="text-sm text-gray-600">Calendar-based calculation for {currentMonthYear}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-blue-600">{workingDaysInfo.workingDays}</p>
                      <p className="text-sm text-gray-500">Working Days</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
                    <div className="bg-blue-50 rounded-lg p-3 text-center">
                      <p className="text-xl font-bold text-blue-600">{workingDaysInfo.totalDays}</p>
                      <p className="text-xs text-gray-600">Total Days</p>
                    </div>
                    <div className="bg-green-50 rounded-lg p-3 text-center">
                      <p className="text-xl font-bold text-green-600">{workingDaysInfo.workingDays}</p>
                      <p className="text-xs text-gray-600">Working Days</p>
                    </div>
                    <div className="bg-orange-50 rounded-lg p-3 text-center">
                      <p className="text-xl font-bold text-orange-600">{workingDaysInfo.holidayCount || holidaysThisMonth.length}</p>
                      <p className="text-xs text-gray-600">Admin Holidays</p>
                    </div>
                    <div className="bg-red-50 rounded-lg p-3 text-center">
                      <p className="text-xl font-bold text-red-600">{holidaysThisMonth.length}</p>
                      <p className="text-xs text-gray-600">Govt Holidays</p>
                    </div>
                    <div className="bg-purple-50 rounded-lg p-3 text-center">
                      <p className="text-xl font-bold text-purple-600">{workingDaysInfo.sundays || 0}</p>
                      <p className="text-xs text-gray-600">Sundays</p>
                    </div>
                  </div>

                  {/* Holidays List */}
                  {holidaysThisMonth.length > 0 && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                        <AlertCircle className="w-4 h-4 mr-1 text-orange-500" />
                        Government Holidays This Month:
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {holidaysThisMonth.map((holiday, index) => (
                          <div key={index} className="flex justify-between items-center bg-white rounded p-2 text-sm">
                            <span className="text-gray-700">{holiday.name}</span>
                            <span className="text-gray-500 text-xs">
                              {new Date(holiday.date).toLocaleDateString('en-IN', {
                                day: 'numeric',
                                month: 'short'
                              })}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Calculation Method Info */}
                  <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-center space-x-2 mb-1">
                      <Calculator className="w-4 h-4 text-blue-600" />
                      <span className="text-sm font-medium text-blue-900">Updated Working Days Calculation</span>
                    </div>
                    <p className="text-xs text-blue-700">
                      Working days = Total days in month - Sundays - Admin holidays.
                      Salaries are calculated using dynamic working days excluding weekends and admin-configured holidays.
                      Daily wage varies by employee's base salary (baseSalary ÷ days in month).
                    </p>
                  </div>
                </motion.div>
              )}

            {/* Charts */}
            {attendanceData.length > 0 && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Attendance Overview</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={attendanceData.slice(0, 10)}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="daysPresent" fill="#3B82F6" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Salary Distribution</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={attendanceData.slice(0, 5).map(emp => ({
                          name: emp.name,
                          value: emp.adjustedSalary
                        }))}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {attendanceData.slice(0, 5).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* AI Insights */}
            {insights && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <span className="mr-2">🤖</span>
                  AI Insights
                </h3>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-gray-700 whitespace-pre-wrap">{insights}</p>
                </div>
              </div>
            )}
            </motion.div>
          )}

        {activeTab === 'upload' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Upload Attendance Data</h3>

              {/* CSV Format Information */}
              <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="text-sm font-medium text-blue-900 mb-2">📋 Supported File Formats</h4>
                <div className="text-sm text-blue-800 space-y-1">
                  <p><strong>Excel:</strong> .xlsx, .xls files with attendance data</p>
                  <p><strong>CSV:</strong> .csv files with columns: Name, Department, Date, Check In, Check Out</p>
                  <p className="text-xs text-blue-600 mt-2">
                    💡 CSV Example: "John Doe,IT,27-07-2025,09:00,17:30"
                  </p>
                </div>
              </div>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                  <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <div className="mt-4">
                  {/* New File Inputs and Month Selector */}
                  <div className="mb-4">
                    <label htmlFor="excel-file-upload" className="block text-sm font-medium text-gray-700 mb-1">
                      Upload Excel File (Detailed Attendance)
                    </label>
                    <input
                      id="excel-file-upload"
                      name="excel-file-upload"
                      type="file"
                      accept=".xlsx,.xls,.csv" // Allow CSV for excelProcessor.js
                      className="mt-1 block w-full text-sm text-gray-900 border border-gray-300 rounded-lg cursor-pointer bg-gray-50 focus:outline-none"
                      onChange={(e) => setExcelFile(e.target.files[0])}
                      disabled={uploading}
                    />
                    {excelFile && <p className="mt-1 text-sm text-gray-500">Selected: {excelFile.name}</p>}
                  </div>

                  <div className="mb-4">
                    <label htmlFor="attendance-file-upload" className="block text-sm font-medium text-gray-700 mb-1">
                      Upload Manual Attendance File (Daily Present Data)
                    </label>
                    <input
                      id="attendance-file-upload"
                      name="attendance-file-upload"
                      type="file"
                      accept=".csv,.pdf" // Now accepts both CSV and PDF files
                      className="mt-1 block w-full text-sm text-gray-900 border border-gray-300 rounded-lg cursor-pointer bg-gray-50 focus:outline-none"
                      onChange={(e) => setAttendanceFile(e.target.files[0])}
                      disabled={uploading}
                    />
                    {attendanceFile && (
                      <p className="mt-1 text-sm text-gray-500">
                        Selected: {attendanceFile.name}
                        <span className="ml-2 px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                          {attendanceFile.name.toLowerCase().endsWith('.pdf') ? 'PDF (AI Processing)' : 'CSV'}
                        </span>
                      </p>
                    )}
                  </div>

                  <div className="mb-4">
                    <label htmlFor="month-year-input" className="block text-sm font-medium text-gray-700 mb-1">
                      Select Month and Year
                    </label>
                    <input
                      id="month-year-input"
                      name="month-year-input"
                      type="month" // HTML5 input type for month/year picker
                      value={selectedMonthYear}
                      onChange={(e) => setSelectedMonthYear(e.target.value)}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      disabled={uploading}
                    />
                  </div>

                  <button
                    onClick={() => setShowHolidayModal(true)}
                    disabled={uploading || !excelFile || !attendanceFile}
                    className="btn-primary w-full py-3 flex items-center justify-center"
                  >
                    {uploading ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Processing Files...
                      </>
                    ) : (
                      <>
                        <Upload className="w-5 h-5 mr-2" />
                        Configure & Process Attendance Data
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Database className="w-5 h-5 mr-2 text-blue-600" />
                User Migration & Management
              </h3>

              <div className="space-y-4">
                {/* Bulk Migration */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-2">Bulk User Migration</h4>
                  <p className="text-sm text-gray-600 mb-3">
                    Import all users from the main company database. This will create accounts for employees who don't exist yet.
                  </p>
                  <button
                    onClick={handleMigrateUsers}
                    disabled={migrating}
                    className="bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white px-6 py-3 rounded-lg transition-colors flex items-center"
                  >
                    {migrating ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Migrating Users...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-5 h-5 mr-2" />
                        Migrate All Users
                      </>
                    )}
                  </button>
                </div>

                {/* Individual User Sync */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-2">Individual User Sync</h4>
                  <p className="text-sm text-gray-600 mb-3">
                    Sync a specific user by email address from the main database.
                  </p>
                  <div className="flex space-x-2">
                    <input
                      type="email"
                      placeholder="Enter user email to sync"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          const email = e.target.value.trim();
                          if (email) {
                            handleSyncUser(email);
                            e.target.value = '';
                          }
                        }
                      }}
                    />
                    <button
                      onClick={(e) => {
                        const input = e.target.parentElement.querySelector('input');
                        const email = input.value.trim();
                        if (email) {
                          handleSyncUser(email);
                          input.value = '';
                        }
                      }}
                      className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors"
                    >
                      Sync User
                    </button>
                  </div>
                </div>

                {/* Remove Duplicates */}
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center">
                        <Users className="w-5 h-5 text-yellow-600 mr-2" />
                        <h4 className="font-medium text-yellow-900">Remove Duplicate Users</h4>
                      </div>
                      <p className="text-sm text-yellow-700 mt-1">
                        Clean up duplicate user entries with the same name. Keeps the record with better data.
                      </p>
                    </div>
                    <button
                      onClick={handleRemoveDuplicates}
                      className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-lg transition-colors"
                    >
                      Remove Duplicates
                    </button>
                  </div>
                </div>

                {/* Migration Status */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <AlertCircle className="w-5 h-5 text-blue-600 mr-2" />
                    <h4 className="font-medium text-blue-900">Migration Info</h4>
                  </div>
                  <p className="text-sm text-blue-700 mt-1">
                    Users must be migrated before they can log in. Run migration after adding new employees to the main system.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'employees' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold text-gray-900">Employee Attendance & Salary</h3>
                  <div className="flex space-x-3">
                    <button
                      onClick={handleExposeSelected}
                      disabled={selectedUsers.length === 0}
                      className="bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white px-4 py-2 rounded-lg transition-colors"
                    >
                      Expose Selected ({selectedUsers.length})
                    </button>
                    <button
                      onClick={async () => {
                        if (selectedUsers.length === 0) {
                          toast.error('Please select users to fix salary discrepancies');
                          return;
                        }

                        try {
                          let fixedCount = 0;
                          for (const userId of selectedUsers) {
                            const response = await fetch(`/api/attendance/fix-salary-discrepancy/${userId}`, {
                              method: 'PUT',
                              headers: {
                                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                                'Content-Type': 'application/json'
                              }
                            });
                            if (response.ok) {
                              fixedCount++;
                            }
                          }
                          await fetchData();
                          setSelectedUsers([]);
                          toast.success(`Fixed salary discrepancies for ${fixedCount} users`);
                        } catch (err) {
                          toast.error('Error fixing salary discrepancies: ' + err.message);
                        }
                      }}
                      disabled={selectedUsers.length === 0}
                      className="bg-purple-500 hover:bg-purple-600 disabled:opacity-50 text-white px-4 py-2 rounded-lg transition-colors"
                    >
                      Fix Salary ({selectedUsers.length})
                    </button>
                    <button
                      onClick={handleDownload}
                      className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg transition-colors"
                    >
                      Download Report
                    </button>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <input
                          type="checkbox"
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedUsers(attendanceData.map(user => user._id));
                            } else {
                              setSelectedUsers([]);
                            }
                          }}
                          className="rounded border-gray-300"
                        />
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Present Days</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payable Days</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Hours</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hours + Holidays</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Effective Days</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Day-wise Salary</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hours-based Salary</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {attendanceData.map((user) => (
                      <tr key={user._id} className="hover:bg-gray-50 cursor-pointer" onClick={() => { setSelectedEmployee(user); setShowSalaryModal(true); }}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <input
                            type="checkbox"
                            checked={selectedUsers.includes(user._id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedUsers([...selectedUsers, user._id]);
                              } else {
                                setSelectedUsers(selectedUsers.filter(id => id !== user._id));
                              }
                            }}
                            className="rounded border-gray-300"
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10">
                              <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                                <span className="text-sm font-medium text-gray-700">
                                  {user.name.charAt(0).toUpperCase()}
                                </span>
                              </div>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">{user.name}</div>
                              <div className="text-sm text-gray-500">{user.employeeId}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{user.dept}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div className="font-medium">{user.daysPresent}</div>
                          <div className="text-xs text-gray-500">Manual attendance</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div className="font-medium">{user.payableDays || user.totalWorkingDays}</div>
                          <div className="text-xs text-gray-500">Present + holidays</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div className="font-medium">{user.hoursWorked || 0}h</div>
                          <div className="text-xs text-gray-500">Biometric data</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div className="font-medium">{user.hoursWithHolidays || 0}h</div>
                          <div className="text-xs text-gray-500">Hours + holiday hours</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div className="font-medium">{user.effectiveDaysWithHolidays || 0}</div>
                          <div className="text-xs text-gray-500">(Hours/8) + holidays</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div className="font-medium">₹{(user.dayWiseSalary || user.adjustedSalary).toLocaleString()}</div>
                          <div className="text-xs text-gray-500">Days × ₹{user.dailyWage || Math.round((user.baseSalary || 8000) / 31)}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div className="font-medium">₹{(user.proportionalSalary || user.adjustedSalary).toLocaleString()}</div>
                          <div className="text-xs text-gray-500">Hours-based method</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            user.exposed
                              ? 'bg-green-100 text-green-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {user.exposed ? 'Exposed' : 'Hidden'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setAdjustingUser(user);
                              setShowAdjustModal(true);
                            }}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            Adjust
                          </button>
                          <button
                            onClick={async (e) => {
                              e.stopPropagation();
                              try {
                                const response = await fetch(`/api/attendance/fix-salary-discrepancy/${user._id}`, {
                                  method: 'PUT',
                                  headers: {
                                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                                    'Content-Type': 'application/json'
                                  }
                                });
                                const result = await response.json();
                                if (response.ok) {
                                  await fetchData();
                                  toast.success(`Salary discrepancy fixed for ${user.name}`);
                                } else {
                                  toast.error('Error: ' + result.message);
                                }
                              } catch (err) {
                                toast.error('Error: ' + err.message);
                              }
                            }}
                            className="text-purple-600 hover:text-purple-900"
                          >
                            Fix Salary
                          </button>
                          <button
                            onClick={async (e) => {
                              e.stopPropagation();
                              try {
                                await exposeAttendance(user._id);
                                await fetchData();
                                toast.success(`${user.exposed ? 'Hidden' : 'Exposed'} ${user.name}'s data`);
                              } catch (err) {
                                toast.error('Error: ' + err.message);
                              }
                            }}
                            className="text-green-600 hover:text-green-900"
                          >
                            {user.exposed ? 'Hide' : 'Expose'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'feedback' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Employee Feedback Management</h3>
              {feedbacks.length === 0 ? (
                <div className="text-center py-8">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  <p className="mt-2 text-gray-500">No feedback received yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {feedbacks.map((feedback) => (
                    <div key={feedback._id} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center space-x-3">
                          <div className="flex-shrink-0 h-10 w-10 bg-gray-300 rounded-full flex items-center justify-center">
                            <span className="text-sm font-medium text-gray-700">
                              {feedback.user?.name?.charAt(0).toUpperCase() || 'U'}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{feedback.user?.name || 'Unknown User'}</p>
                            <p className="text-sm text-gray-500">{feedback.user?.email || feedback.userId}</p>
                          </div>
                          <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${
                            feedback.status === 'pending'
                              ? 'bg-yellow-100 text-yellow-800'
                              : feedback.status === 'reviewed'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-green-100 text-green-800'
                          }`}>
                            {feedback.status.charAt(0).toUpperCase() + feedback.status.slice(1)}
                          </span>
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                            feedback.type === 'salary_dispute'
                              ? 'bg-red-100 text-red-800'
                              : feedback.type === 'attendance_query'
                              ? 'bg-orange-100 text-orange-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {feedback.type.replace('_', ' ').toUpperCase()}
                          </span>
                        </div>
                        <div className="text-sm text-gray-500">
                          {new Date(feedback.createdAt).toLocaleDateString()}
                        </div>
                      </div>

                      <div className="mb-4">
                        <p className="text-gray-700 bg-gray-50 p-3 rounded-lg">{feedback.message}</p>
                      </div>

                      {feedback.adminResponse && (
                        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                          <p className="text-sm font-medium text-blue-900 mb-1">Admin Response:</p>
                          <p className="text-blue-800">{feedback.adminResponse}</p>
                          {feedback.respondedAt && (
                            <p className="text-xs text-blue-600 mt-2">
                              Responded on {new Date(feedback.respondedAt).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      )}

                      <div className="flex justify-between items-center">
                        <div className="flex space-x-2">
                          {feedback.status !== 'resolved' && (
                            <>
                              <button
                                onClick={() => {
                                  setSelectedFeedback(feedback);
                                  setAdminResponse(feedback.adminResponse || '');
                                  setShowFeedbackModal(true);
                                }}
                                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                              >
                                {feedback.adminResponse ? 'Update Response' : 'Respond'}
                              </button>
                              <button
                                onClick={() => handleStatusUpdate(feedback._id, 'resolved')}
                                className="text-green-600 hover:text-green-800 text-sm font-medium"
                              >
                                Mark Resolved
                              </button>
                            </>
                          )}
                          {feedback.status === 'pending' && (
                            <button
                              onClick={() => handleStatusUpdate(feedback._id, 'reviewed')}
                              className="text-yellow-600 hover:text-yellow-800 text-sm font-medium"
                            >
                              Mark Reviewed
                            </button>
                          )}
                        </div>
                        {feedback.monthYear && (
                          <span className="text-xs text-gray-500">
                            Period: {feedback.monthYear}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <SettingsTab 
            settings={settings}
            setSettings={setSettings}
            systemStats={systemStats}
            setSystemStats={setSystemStats}
            settingsLoading={settingsLoading}
            setSettingsLoading={setSettingsLoading}
            attendanceData={attendanceData}
            fetchData={fetchData}
          />
        )}
      </div>

      {/* Salary Adjustment Modal */}
      <SalaryAdjustmentModal
        isOpen={showAdjustModal}
        onClose={() => {
          setShowAdjustModal(false);
          setAdjustingUser(null);
        }}
        user={adjustingUser}
        onIncrease={async (amount, reason) => {
          const result = await increaseSalary(adjustingUser._id, amount, reason);
          toast.success(`Salary increased by ₹${amount} for ${adjustingUser.name}`);
          await fetchData();
        }}
        onDecrease={async (amount, reason) => {
          const result = await decreaseSalary(adjustingUser._id, amount, reason);
          toast.success(`Salary decreased by ₹${amount} for ${adjustingUser.name}`);
          await fetchData();
        }}
        onManualAdjust={async (newSalary, reason) => {
          await adjustSalary(adjustingUser._id, newSalary, reason);
          toast.success(`Salary manually adjusted to ₹${newSalary} for ${adjustingUser.name}`);
          await fetchData();
        }}
        loading={false}
      />

      {/* Feedback Response Modal */}
      {showFeedbackModal && selectedFeedback && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Respond to Feedback from {selectedFeedback.user?.name || 'User'}
              </h3>

              <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Original Message:</p>
                <p className="text-gray-800">{selectedFeedback.message}</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Your Response</label>
                  <textarea
                    value={adminResponse}
                    onChange={(e) => setAdminResponse(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={4}
                    placeholder="Enter your response to the employee..."
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => {
                    setShowFeedbackModal(false);
                    setSelectedFeedback(null);
                    setAdminResponse('');
                  }}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleFeedbackResponse}
                  disabled={!adminResponse.trim()}
                  className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Send Response
                </button>
              </div>
            </div>
          </div>
        </div>
        )}

      {/* Salary Explanation Modal */}
      <SalaryExplanationModal
        isOpen={showSalaryModal}
        onClose={() => {
          setShowSalaryModal(false);
          setSelectedEmployee(null);
        }}
        employee={selectedEmployee}
        monthYear={currentMonthYear}
      />

      {/* Holiday Input Modal */}
      <HolidayInputModal
        isOpen={showHolidayModal}
        onClose={() => setShowHolidayModal(false)}
        onSubmit={handleHolidaySubmit}
      />

      {/* Upload Confirmation Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-white rounded-xl shadow-2xl max-w-md w-full"
          >
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-4 rounded-t-xl">
              <h2 className="text-xl font-bold">Confirm Upload Configuration</h2>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-3">Upload Summary</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Excel File:</span>
                    <span className="font-medium">{excelFile?.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Attendance File:</span>
                    <span className="font-medium">{attendanceFile?.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Month/Year:</span>
                    <span className="font-medium">{selectedMonthYear}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Holidays:</span>
                    <span className="font-medium">{totalHolidays}</span>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <Calculator className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-900">Calculation Preview</span>
                </div>
                <p className="text-xs text-blue-700 mb-2">
                  Present days from files will be combined with {totalHolidays} holidays for salary calculation.
                  Daily wage calculated per employee: Base Salary ÷ Days in Month × (Present Days + Holidays)
                </p>
                {attendanceFile?.name.toLowerCase().endsWith('.pdf') && (
                  <div className="mt-2 p-2 bg-blue-100 rounded text-xs text-blue-800">
                    <span className="font-medium">🤖 AI Processing:</span> PDF will be analyzed using Groq AI to extract attendance data automatically.
                  </div>
                )}
              </div>
            </div>

            <div className="border-t border-gray-200 px-6 py-4 flex justify-end space-x-3">
              <button
                onClick={() => setShowUploadModal(false)}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleProcessFiles}
                disabled={uploading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {uploading ? 'Processing...' : 'Confirm & Upload'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
      </div>
    </>
  );
}

export default AdminDashboard;
