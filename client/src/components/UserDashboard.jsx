import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { getUserAttendance, submitFeedback, getFeedbacks } from '../api';
import SalaryBreakdownComponent from './SalaryBreakdownComponent';
import AttendanceCalendar from './AttendanceCalendar';
import { motion } from 'framer-motion';
import {
  Calendar, Clock, DollarSign, TrendingUp,
  MessageSquare, Send, User, BarChart3,
  AlertCircle, CheckCircle, X, Lock,
  MessageCircle, Eye
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

function UserDashboard() {
  const [userData, setUserData] = useState(null);
  const [feedback, setFeedback] = useState('');
  const [feedbackType, setFeedbackType] = useState('general');
  const [loading, setLoading] = useState(true);
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const [user, setUser] = useState(null);
  const [feedbacks, setFeedbacks] = useState([]);
  const [activeTab, setActiveTab] = useState('salary');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const userInfo = JSON.parse(localStorage.getItem('user'));
        console.log('User info from localStorage:', userInfo);
        setUser(userInfo);

        if (userInfo && userInfo._id) {
          console.log('Fetching attendance for user ID:', userInfo._id);
          const data = await getUserAttendance(userInfo._id);
          console.log('Received attendance data:', data);
          setUserData(data);
          
          // Fetch user's feedback to show admin responses
          const feedbackData = await getFeedbacks();
          setFeedbacks(feedbackData);
        } else {
          console.log('No user ID found in localStorage');
        }
      } catch (err) {
        console.error('Error fetching user data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleFeedbackSubmit = async () => {
    if (!feedback.trim()) {
      toast.error('Please enter your feedback');
      return;
    }

    try {
      setSubmittingFeedback(true);
      await submitFeedback({
        userId: user._id,
        message: feedback,
        type: feedbackType,
        attendanceId: userData?._id
      });
      setFeedback('');
      toast.success('Feedback submitted successfully! Admin will review it soon.', {
        duration: 4000,
        position: 'top-center',
      });
    } catch (err) {
      console.error('Error submitting feedback:', err);
      toast.error('Error submitting feedback. Please try again.', {
        duration: 4000,
        position: 'top-center',
      });
    } finally {
      setSubmittingFeedback(false);
    }
  };

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
              <User className="w-8 h-8 text-primary-600" />
            </div>
          </div>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-6 text-lg text-secondary-600 font-medium"
          >
            Loading your dashboard...
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
                <h1 className="text-3xl font-bold text-gradient">Welcome, {user?.name}</h1>
                <p className="text-secondary-600 mt-1">View your attendance and salary information</p>
              </motion.div>
              <motion.button
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
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
              </motion.button>
            </div>
          </div>
        </motion.div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {(() => {
            console.log('Rendering condition check:', {
              userData: !!userData,
              exposed: userData?.exposed,
              fullUserData: userData
            });
            // Check if userData exists and has exposed property set to true
            // Also handle case where API returns object with exposed: false
            return userData && userData.exposed === true;
          })() ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="space-y-8"
            >
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="card hover:shadow-glow transition-all duration-300"
                >
                  <div className="flex items-center">
                    <div className="p-3 bg-primary-100 rounded-xl">
                      <Calendar className="w-6 h-6 text-primary-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-secondary-600">Days Present</p>
                      <p className="text-2xl font-bold text-secondary-900">{userData.daysPresent}</p>
                      <p className="text-xs text-secondary-500">Manual attendance</p>
                    </div>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.45 }}
                  className="card hover:shadow-glow transition-all duration-300"
                >
                  <div className="flex items-center">
                    <div className="p-3 bg-green-100 rounded-xl">
                      <TrendingUp className="w-6 h-6 text-green-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-secondary-600">Payable Days</p>
                      <p className="text-2xl font-bold text-secondary-900">{userData.payableDays || userData.totalWorkingDays}</p>
                      <p className="text-xs text-secondary-500">Present + holidays</p>
                    </div>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="card hover:shadow-glow transition-all duration-300"
                >
                  <div className="flex items-center">
                    <div className="p-3 bg-success-100 rounded-xl">
                      <Clock className="w-6 h-6 text-success-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-secondary-600">Total Hours</p>
                      <p className="text-2xl font-bold text-secondary-900">{userData.hoursWorked}h</p>
                      <p className="text-xs text-secondary-500">Biometric data</p>
                    </div>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.55 }}
                  className="card hover:shadow-glow transition-all duration-300"
                >
                  <div className="flex items-center">
                    <div className="p-3 bg-blue-100 rounded-xl">
                      <Clock className="w-6 h-6 text-blue-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-secondary-600">Effective Days</p>
                      <p className="text-2xl font-bold text-secondary-900">{userData.effectiveDaysWithHolidays}</p>
                      <p className="text-xs text-secondary-500">(Hours/8) + holidays</p>
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
                    <div className="p-3 bg-warning-100 rounded-xl">
                      <DollarSign className="w-6 h-6 text-warning-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-secondary-600">Day-wise Salary</p>
                      <p className="text-2xl font-bold text-secondary-900">₹{userData.dayWiseSalary.toLocaleString()}</p>
                      <p className="text-xs text-secondary-500">Days × ₹{userData.dailyWage}</p>
                    </div>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.65 }}
                  className="card hover:shadow-glow transition-all duration-300"
                >
                  <div className="flex items-center">
                    <div className="p-3 bg-purple-100 rounded-xl">
                      <BarChart3 className="w-6 h-6 text-purple-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-secondary-600">Final Salary</p>
                      <p className="text-2xl font-bold text-secondary-900">₹{userData.adjustedSalary.toLocaleString()}</p>
                      <p className="text-xs text-secondary-500">After adjustments</p>
                    </div>
                  </div>
                </motion.div>
              </div>

              {/* Salary Calculation Summary */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.75 }}
                className="card bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <DollarSign className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-blue-900">August 2025 Salary Calculation</h3>
                      <p className="text-sm text-blue-700">Two calculation methods with 26-day cap</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-blue-600">₹{userData.adjustedSalary.toLocaleString()}</p>
                    <p className="text-sm text-blue-500">Final Salary</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white rounded-lg p-4 border border-blue-200">
                    <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                      <Calendar className="w-4 h-4 mr-2 text-blue-600" />
                      Day-wise Method
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Days Present:</span>
                        <span className="font-medium">{userData.daysPresent}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>+ Holidays:</span>
                        <span className="font-medium">{(userData.payableDays - userData.daysPresent)}</span>
                      </div>
                      <div className="flex justify-between border-t pt-2">
                        <span>= Payable Days:</span>
                        <span className="font-medium text-blue-600">{userData.payableDays}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>× Daily Wage (₹{userData.dailyWage}):</span>
                        <span className="font-bold text-blue-600">₹{userData.dayWiseSalary.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg p-4 border border-purple-200">
                    <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                      <Clock className="w-4 h-4 mr-2 text-purple-600" />
                      Hours-based Method
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Hours Worked:</span>
                        <span className="font-medium">{userData.hoursWorked}h</span>
                      </div>
                      <div className="flex justify-between">
                        <span>+ Holiday Hours:</span>
                        <span className="font-medium">{(userData.hoursWithHolidays - userData.hoursWorked)}h</span>
                      </div>
                      <div className="flex justify-between border-t pt-2">
                        <span>= Total Hours:</span>
                        <span className="font-medium text-purple-600">{userData.hoursWithHolidays}h</span>
                      </div>
                      <div className="flex justify-between">
                        <span>÷ 8 + Holidays:</span>
                        <span className="font-medium text-purple-600">{userData.effectiveDaysWithHolidays} days</span>
                      </div>
                      <div className="flex justify-between">
                        <span>× Daily Wage (₹{userData.dailyWage}):</span>
                        <span className="font-bold text-purple-600">₹{userData.proportionalSalary.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 p-3 bg-blue-100 rounded-lg">
                  <p className="text-xs text-blue-700">
                    <strong>26-Day Cap Applied:</strong> Both methods are capped at 26 days × employee daily wage. Daily wage = Base Salary ÷ Days in Month.
                    WFH days automatically credit 8 hours. Final salary uses the day-wise method result.
                  </p>
                </div>
              </motion.div>

            {/* Working Days Information */}
            {userData.monthStatistics && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
                className="card"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Calendar className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">Working Days ({userData.monthYear})</h3>
                      <p className="text-sm text-gray-600">Total days - Sundays - Admin holidays</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-blue-600">{userData.totalWorkingDays}</p>
                    <p className="text-sm text-gray-500">Required Days</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
                  <div className="bg-blue-50 rounded-lg p-3 text-center">
                    <p className="text-xl font-bold text-blue-600">{userData.monthStatistics.totalDays}</p>
                    <p className="text-xs text-gray-600">Total Days</p>
                  </div>
                  <div className="bg-green-50 rounded-lg p-3 text-center">
                    <p className="text-xl font-bold text-green-600">{userData.monthStatistics.workingDays}</p>
                    <p className="text-xs text-gray-600">Working Days</p>
                  </div>
                  <div className="bg-orange-50 rounded-lg p-3 text-center">
                    <p className="text-xl font-bold text-orange-600">{userData.monthStatistics.holidayCount || 0}</p>
                    <p className="text-xs text-gray-600">Admin Holidays</p>
                  </div>
                  <div className="bg-red-50 rounded-lg p-3 text-center">
                    <p className="text-xl font-bold text-red-600">{userData.monthStatistics.holidays?.length || 0}</p>
                    <p className="text-xs text-gray-600">Govt Holidays</p>
                  </div>
                  <div className="bg-purple-50 rounded-lg p-3 text-center">
                    <p className="text-xl font-bold text-purple-600">{userData.monthStatistics.sundays || 0}</p>
                    <p className="text-xs text-gray-600">Sundays</p>
                  </div>
                </div>

                {/* Holidays List for User */}
                {userData.monthStatistics.holidays && userData.monthStatistics.holidays.length > 0 && (
                  <div className="bg-gray-50 rounded-lg p-3">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Government Holidays This Month:</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {userData.monthStatistics.holidays.map((holiday, index) => (
                        <div key={index} className="flex justify-between items-center bg-white rounded p-2 text-sm">
                          <span className="text-gray-700">{holiday.name || holiday}</span>
                          <span className="text-gray-500 text-xs">
                            {holiday.date ? new Date(holiday.date).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short'
                            }) : ''}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            )}

              {/* Main Content */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column - Salary Breakdown */}
                <div className="lg:col-span-2 space-y-6">
                  <div className="card">
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-xl font-bold text-secondary-900">Salary Breakdown</h2>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => setActiveTab('salary')}
                          className={`px-4 py-2 rounded-lg font-medium ${
                            activeTab === 'salary' 
                              ? 'bg-primary-100 text-primary-700' 
                              : 'text-secondary-600 hover:bg-secondary-100'
                          }`}
                        >
                          Details
                        </button>
                        <button
                          onClick={() => setActiveTab('calendar')}
                          className={`px-4 py-2 rounded-lg font-medium ${
                            activeTab === 'calendar' 
                              ? 'bg-primary-100 text-primary-700' 
                              : 'text-secondary-600 hover:bg-secondary-100'
                          }`}
                        >
                          Calendar
                        </button>
                      </div>
                    </div>
                    
                    {activeTab === 'salary' ? (
                      <SalaryBreakdownComponent userData={userData} isVisible={true} />
                    ) : (
                      <AttendanceCalendar 
                        attendanceData={userData} 
                        workingDaysInfo={userData.workingDaysInfo}
                        monthYear={userData.monthYear}
                      />
                    )}
                  </div>
                </div>

                {/* Right Column - Feedback */}
                <div className="space-y-6">
                  {/* Submit Feedback */}
                  <div className="card">
                    <h3 className="text-lg font-semibold text-secondary-900 mb-4 flex items-center">
                      <MessageSquare className="w-5 h-5 mr-2 text-primary-600" />
                      Submit Feedback
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <label className="label">Feedback Type</label>
                        <select
                          value={feedbackType}
                          onChange={(e) => setFeedbackType(e.target.value)}
                          className="input-field w-full"
                        >
                          <option value="general">General Feedback</option>
                          <option value="salary_dispute">Salary Dispute</option>
                          <option value="attendance_query">Attendance Query</option>
                        </select>
                      </div>
                      <div>
                        <label className="label">Your Message</label>
                        <textarea
                          value={feedback}
                          onChange={(e) => setFeedback(e.target.value)}
                          rows={4}
                          className="input-field w-full"
                          placeholder="Share your thoughts, concerns, or suggestions..."
                        />
                      </div>
                      <button
                        onClick={handleFeedbackSubmit}
                        disabled={submittingFeedback || !feedback.trim()}
                        className="w-full btn-primary flex items-center justify-center"
                      >
                        {submittingFeedback ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Submitting...
                          </>
                        ) : (
                          <>
                            <Send className="w-4 h-4 mr-2" />
                            Submit Feedback
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Admin Responses */}
                  {feedbacks && feedbacks.length > 0 && (
                    <div className="card">
                      <h3 className="text-lg font-semibold text-secondary-900 mb-4 flex items-center">
                        <Eye className="w-5 h-5 mr-2 text-green-600" />
                        Admin Responses
                      </h3>
                      <div className="space-y-4 max-h-96 overflow-y-auto">
                        {feedbacks
                          .filter(fb => fb.adminResponse)
                          .map((feedback) => (
                            <div key={feedback._id} className="border border-gray-200 rounded-lg p-4">
                              <div className="flex items-start justify-between mb-2">
                                <span className={`px-2 py-1 rounded text-xs font-medium ${
                                  feedback.type === 'salary_dispute' 
                                    ? 'bg-red-100 text-red-800' 
                                    : feedback.type === 'attendance_query' 
                                      ? 'bg-blue-100 text-blue-800' 
                                      : 'bg-gray-100 text-gray-800'
                                }`}>
                                  {feedback.type.replace('_', ' ').toUpperCase()}
                                </span>
                                <span className="text-xs text-gray-500">
                                  {new Date(feedback.createdAt).toLocaleDateString()}
                                </span>
                              </div>
                              <p className="text-sm text-gray-700 mb-3">{feedback.message}</p>
                              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                                <div className="flex items-center text-green-800 mb-1">
                                  <MessageCircle className="w-4 h-4 mr-1" />
                                  <span className="font-medium text-sm">Admin Response</span>
                                </div>
                                <p className="text-sm text-green-700">{feedback.adminResponse}</p>
                                <div className="mt-2 text-xs text-green-600">
                                  Responded by: {feedback.respondedBy || 'Admin'} on{' '}
                                  {feedback.respondedAt 
                                    ? new Date(feedback.respondedAt).toLocaleString() 
                                    : 'N/A'}
                                </div>
                              </div>
                            </div>
                          ))}
                        
                        {feedbacks.filter(fb => fb.adminResponse).length === 0 && (
                          <p className="text-gray-500 text-center py-4">
                            No responses from admin yet. Your feedback is pending review.
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Hours Worked Overview</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={[userData]}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="hoursWorked" fill="#3B82F6" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {userData.attendanceDetails && userData.attendanceDetails.length > 0 && (
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Daily Attendance Trend</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={userData.attendanceDetails.slice(-10)}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip />
                        <Line type="monotone" dataKey="hoursWorked" stroke="#10B981" strokeWidth={2} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              {/* Feedback Section */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.9 }}
                className="card"
              >
                <h3 className="text-lg font-semibold text-secondary-900 mb-4 flex items-center">
                  <MessageSquare className="w-5 h-5 mr-2 text-primary-600" />
                  Submit Feedback or Query
                </h3>

                <div className="space-y-4">
                  <div>
                    <label className="label">Feedback Type</label>
                    <select
                      value={feedbackType}
                      onChange={(e) => setFeedbackType(e.target.value)}
                      className="input-field"
                    >
                      <option value="general">General Feedback</option>
                      <option value="salary_dispute">Salary Dispute</option>
                      <option value="attendance_query">Attendance Query</option>
                    </select>
                  </div>

                  <div>
                    <label className="label">Your Message</label>
                    <textarea
                      value={feedback}
                      onChange={(e) => setFeedback(e.target.value)}
                      placeholder="Enter your feedback, concerns, or questions about your salary calculation..."
                      className="input-field"
                      rows={4}
                    />
                  </div>

                  <motion.button
                    onClick={handleFeedbackSubmit}
                    disabled={submittingFeedback || !feedback.trim()}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="btn-primary flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submittingFeedback ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span>Submitting...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-5 h-5" />
                        <span>Submit Feedback</span>
                      </>
                    )}
                  </motion.button>
                </div>
              </motion.div>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 }}
              className="card p-12 text-center"
            >
              <Lock className="mx-auto h-24 w-24 text-secondary-400 mb-4" />
              <h3 className="text-lg font-medium text-secondary-900 mb-2">No Data Available</h3>
              <p className="text-secondary-600">
                Your attendance and salary data hasn't been made available yet.
                Please contact your administrator or wait for the data to be processed.
              </p>
            </motion.div>
          )}
        </div>
      </div>
    </>
  );
}

export default UserDashboard;