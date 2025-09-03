import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Calculator, Calendar, Clock, DollarSign, 
  Info, TrendingUp, BarChart3, AlertTriangle,
  CheckCircle, Zap, Users, FileText
} from 'lucide-react';
import { calculateSalaryWithCalendar, getCalendarWorkingDays } from '../api';

const SalaryExplanationModal = ({ isOpen, onClose, employee, monthYear }) => {
  const [calculationDetails, setCalculationDetails] = useState(null);
  const [workingDaysInfo, setWorkingDaysInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (isOpen && employee) {
      fetchCalculationDetails();
    }
  }, [isOpen, employee, monthYear]);

  const fetchCalculationDetails = async () => {
    if (!employee) return;
    
    setLoading(true);
    try {
      // Fetch working days info
      const workingDays = await getCalendarWorkingDays(monthYear || employee.monthYear);
      setWorkingDaysInfo(workingDays);

      // Calculate salary details
      const salaryDetails = await calculateSalaryWithCalendar({
        hoursWorked: employee.hoursWorked,
        daysPresent: employee.daysPresent,
        monthYear: monthYear || employee.monthYear,
        dailyWage: employee.dailyWage || 258,
        baseSalary: employee.baseSalary || 8000
      });
      setCalculationDetails(salaryDetails.calculation);
    } catch (error) {
      console.error('Error fetching calculation details:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short'
    });
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-white bg-opacity-20 rounded-lg">
                  <Calculator className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">Salary Calculation Breakdown</h2>
                  <p className="text-blue-100">
                    {employee?.name} - {monthYear || employee?.monthYear}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="border-b border-gray-200">
            <div className="flex">
              {[
                { id: 'overview', name: 'Overview', icon: BarChart3 },
                { id: 'calculation', name: 'Calculation', icon: Calculator },
                { id: 'workingDays', name: 'Working Days', icon: Calendar },
                { id: 'breakdown', name: 'Detailed Breakdown', icon: FileText }
              ].map((tab) => {
                const IconComponent = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center px-6 py-3 text-sm font-medium transition-colors ${
                      activeTab === tab.id
                        ? 'border-b-2 border-blue-500 text-blue-600 bg-blue-50'
                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <IconComponent className="w-4 h-4 mr-2" />
                    {tab.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Content */}
          <div className="p-6 max-h-[60vh] overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200 border-t-blue-600"></div>
                <span className="ml-3 text-gray-600">Loading calculation details...</span>
              </div>
            ) : (
              <>
                {/* Overview Tab */}
                {activeTab === 'overview' && (
                  <div className="space-y-6">
                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                      <div className="bg-blue-50 rounded-lg p-4 text-center">
                        <Clock className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                        <p className="text-2xl font-bold text-blue-600">{employee?.hoursWorked || 0}h</p>
                        <p className="text-sm text-gray-600">Hours Worked</p>
                      </div>
                      <div className="bg-green-50 rounded-lg p-4 text-center">
                        <Calendar className="w-8 h-8 text-green-600 mx-auto mb-2" />
                        <p className="text-2xl font-bold text-green-600">{employee?.daysPresent}</p>
                        <p className="text-sm text-gray-600">Days Present</p>
                      </div>
                      <div className="bg-purple-50 rounded-lg p-4 text-center">
                        <TrendingUp className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                        <p className="text-2xl font-bold text-purple-600">{employee?.payableDays || employee?.totalWorkingDays}</p>
                        <p className="text-sm text-gray-600">Payable Days</p>
                      </div>
                      <div className="bg-yellow-50 rounded-lg p-4 text-center">
                        <Calculator className="w-8 h-8 text-yellow-600 mx-auto mb-2" />
                        <p className="text-2xl font-bold text-yellow-600">{employee?.effectiveDaysWithHolidays || 0}</p>
                        <p className="text-sm text-gray-600">Effective Days</p>
                      </div>
                      <div className="bg-orange-50 rounded-lg p-4 text-center">
                        <DollarSign className="w-8 h-8 text-orange-600 mx-auto mb-2" />
                        <p className="text-2xl font-bold text-orange-600">
                          {formatCurrency(employee?.adjustedSalary || 0)}
                        </p>
                        <p className="text-sm text-gray-600">Final Salary</p>
                      </div>
                    </div>

                    {/* Two Salary Methods Comparison */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
                        <div className="flex items-center space-x-3 mb-4">
                          <div className="p-2 bg-blue-100 rounded-lg">
                            <Calendar className="w-6 h-6 text-blue-600" />
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold text-blue-900">Day-wise Salary Method</h3>
                            <p className="text-sm text-blue-700">Present Days + Holidays</p>
                          </div>
                        </div>
                        <div className="space-y-3">
                          <div className="flex justify-between text-sm">
                            <span className="text-blue-700">Days Present:</span>
                            <span className="font-medium">{employee?.daysPresent}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-blue-700">+ Holidays:</span>
                            <span className="font-medium">{(employee?.payableDays || employee?.totalWorkingDays) - employee?.daysPresent}</span>
                          </div>
                          <div className="flex justify-between text-sm border-t border-blue-200 pt-2">
                            <span className="text-blue-700">= Payable Days:</span>
                            <span className="font-medium">{employee?.payableDays || employee?.totalWorkingDays}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-blue-700">× Daily Wage:</span>
                            <span className="font-medium">₹{employee?.dailyWage || 258}</span>
                          </div>
                          <div className="flex justify-between text-lg font-bold text-blue-900 bg-blue-100 p-3 rounded-lg">
                            <span>Day-wise Salary:</span>
                            <span>{formatCurrency(employee?.dayWiseSalary || employee?.adjustedSalary)}</span>
                          </div>
                        </div>
                      </div>

                      <div className="bg-green-50 rounded-lg p-6 border border-green-200">
                        <div className="flex items-center space-x-3 mb-4">
                          <div className="p-2 bg-green-100 rounded-lg">
                            <Clock className="w-6 h-6 text-green-600" />
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold text-green-900">Hours-based Salary Method</h3>
                            <p className="text-sm text-green-700">Hours Worked + Holiday Hours</p>
                          </div>
                        </div>
                        <div className="space-y-3">
                          <div className="flex justify-between text-sm">
                            <span className="text-green-700">Hours Worked:</span>
                            <span className="font-medium">{employee?.hoursWorked || 0}h</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-green-700">+ Holiday Hours:</span>
                            <span className="font-medium">{(employee?.hoursWithHolidays || 0) - (employee?.hoursWorked || 0)}h</span>
                          </div>
                          <div className="flex justify-between text-sm border-t border-green-200 pt-2">
                            <span className="text-green-700">= Total Hours:</span>
                            <span className="font-medium">{employee?.hoursWithHolidays || 0}h</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-green-700">÷ 8 + Holidays:</span>
                            <span className="font-medium">{employee?.effectiveDaysWithHolidays || 0} days</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-green-700">× Daily Wage:</span>
                            <span className="font-medium">₹{employee?.dailyWage || 258}</span>
                          </div>
                          <div className="flex justify-between text-lg font-bold text-green-900 bg-green-100 p-3 rounded-lg">
                            <span>Hours-based Salary:</span>
                            <span>{formatCurrency(employee?.proportionalSalary || employee?.adjustedSalary)}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Employee Info */}
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h3 className="text-lg font-semibold text-gray-900 mb-3">Employee Information</h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">Name:</span>
                          <p className="font-medium">{employee?.name}</p>
                        </div>
                        <div>
                          <span className="text-gray-600">Department:</span>
                          <p className="font-medium">{employee?.dept}</p>
                        </div>
                        <div>
                          <span className="text-gray-600">Employee ID:</span>
                          <p className="font-medium">{employee?.employeeId}</p>
                        </div>
                        <div>
                          <span className="text-gray-600">Base Salary:</span>
                          <p className="font-medium">{formatCurrency(employee?.baseSalary || 8000)}</p>
                        </div>
                      </div>
                    </div>

                    {/* August 2025 Calculation Summary */}
                    <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-6 border border-purple-200">
                      <div className="flex items-center space-x-3 mb-4">
                        <div className="p-2 bg-purple-100 rounded-lg">
                          <Calculator className="w-6 h-6 text-purple-600" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-purple-900">August 2025 Calculation Summary</h3>
                          <p className="text-sm text-purple-700">31 total days, 26-day salary cap applied</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-white rounded-lg p-4">
                          <h4 className="font-medium text-gray-900 mb-2">Manual Attendance</h4>
                          <div className="space-y-1 text-sm">
                            <div className="flex justify-between">
                              <span>Days Present:</span>
                              <span className="font-medium">{employee?.daysPresent}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>+ Holidays:</span>
                              <span className="font-medium">{((employee?.payableDays || employee?.totalWorkingDays) - employee?.daysPresent) || 5}</span>
                            </div>
                            <div className="flex justify-between font-medium text-purple-600">
                              <span>Days Presenty:</span>
                              <span>{employee?.payableDays || employee?.totalWorkingDays}</span>
                            </div>
                          </div>
                        </div>
                        <div className="bg-white rounded-lg p-4">
                          <h4 className="font-medium text-gray-900 mb-2">Biometric Hours</h4>
                          <div className="space-y-1 text-sm">
                            <div className="flex justify-between">
                              <span>Total Hours:</span>
                              <span className="font-medium">{employee?.hoursWorked || 0}h</span>
                            </div>
                            <div className="flex justify-between">
                              <span>÷ 8 + Holidays:</span>
                              <span className="font-medium">{employee?.effectiveDaysWithHolidays || 0}</span>
                            </div>
                            <div className="flex justify-between font-medium text-purple-600">
                              <span>Hours Presenty Days:</span>
                              <span>{employee?.effectiveDaysWithHolidays || 0}</span>
                            </div>
                          </div>
                        </div>
                        <div className="bg-white rounded-lg p-4">
                          <h4 className="font-medium text-gray-900 mb-2">Final Salary</h4>
                          <div className="space-y-1 text-sm">
                            <div className="flex justify-between">
                              <span>Day-wise (capped):</span>
                              <span className="font-medium">{formatCurrency(employee?.dayWiseSalary || 0)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Hours-based (capped):</span>
                              <span className="font-medium">{formatCurrency(employee?.proportionalSalary || 0)}</span>
                            </div>
                            <div className="flex justify-between font-bold text-purple-600 border-t pt-1">
                              <span>Applied Salary:</span>
                              <span>{formatCurrency(employee?.adjustedSalary || 0)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="mt-4 p-3 bg-purple-100 rounded-lg">
                        <p className="text-xs text-purple-700">
                          <strong>26-Day Cap:</strong> Both methods are capped at 26 days × ₹258 = ₹6,708 maximum salary per month.
                          WFH days are credited 8 hours automatically in the manual attendance processing.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Calculation Tab */}
                {activeTab === 'calculation' && calculationDetails && (
                  <div className="space-y-6">
                    {/* Calculation Method */}
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h3 className="text-lg font-semibold text-gray-900 mb-3">Calculation Method</h3>
                      <div className="flex items-center space-x-3">
                        <div className={`p-2 rounded-lg ${
                          calculationDetails.calculationMethod === 'daily_wage' 
                            ? 'bg-blue-100 text-blue-600' 
                            : 'bg-green-100 text-green-600'
                        }`}>
                          <Calculator className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-medium">
                            {calculationDetails.calculationMethod === 'daily_wage' 
                              ? 'Daily Wage Method' 
                              : 'Proportional Method'}
                          </p>
                          <p className="text-sm text-gray-600">
                            {calculationDetails.calculationMethod === 'daily_wage'
                              ? 'Salary = Days Worked × Daily Wage Rate'
                              : 'Salary = Base Salary × (Days Worked / Required Days)'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Step by Step Calculation */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-gray-900">Step-by-Step Calculation</h3>
                      
                      <div className="space-y-3">
                        <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                          <span className="text-gray-700">1. Total working days in month:</span>
                          <span className="font-medium">
                            {calculationDetails.workingDaysInfo?.workingDays || workingDaysInfo?.workingDays} days
                          </span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                          <span className="text-gray-700">2. Required working days (max 27):</span>
                          <span className="font-medium">{calculationDetails.requiredDays} days</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                          <span className="text-gray-700">3. Days employee worked:</span>
                          <span className="font-medium text-blue-600">{calculationDetails.daysPresent} days</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                          <span className="text-gray-700">4. Daily wage rate:</span>
                          <span className="font-medium">₹{calculationDetails.dailyWage}</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg border border-green-200">
                          <span className="text-gray-700 font-medium">5. Final calculated salary:</span>
                          <span className="font-bold text-green-600">
                            {formatCurrency(calculationDetails.calculatedSalary)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Performance Metrics */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-blue-50 rounded-lg p-4 text-center">
                        <p className="text-sm text-gray-600 mb-1">Attendance Rate</p>
                        <p className="text-2xl font-bold text-blue-600">
                          {Math.round(calculationDetails.attendancePercentage)}%
                        </p>
                      </div>
                      <div className="bg-green-50 rounded-lg p-4 text-center">
                        <p className="text-sm text-gray-600 mb-1">Hours Efficiency</p>
                        <p className="text-2xl font-bold text-green-600">
                          {Math.round(calculationDetails.hoursPercentage)}%
                        </p>
                      </div>
                      <div className="bg-purple-50 rounded-lg p-4 text-center">
                        <p className="text-sm text-gray-600 mb-1">Avg Hours/Day</p>
                        <p className="text-2xl font-bold text-purple-600">
                          {calculationDetails.avgHoursPerDay}h
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Working Days Tab */}
                {activeTab === 'workingDays' && workingDaysInfo && (
                  <div className="space-y-6">
                    {/* Month Overview */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="bg-blue-50 rounded-lg p-4 text-center">
                        <p className="text-2xl font-bold text-blue-600">{workingDaysInfo.totalDays}</p>
                        <p className="text-sm text-gray-600">Total Days</p>
                      </div>
                      <div className="bg-green-50 rounded-lg p-4 text-center">
                        <p className="text-2xl font-bold text-green-600">{workingDaysInfo.workingDays}</p>
                        <p className="text-sm text-gray-600">Working Days</p>
                      </div>
                      <div className="bg-orange-50 rounded-lg p-4 text-center">
                        <p className="text-2xl font-bold text-orange-600">{workingDaysInfo.holidayCount}</p>
                        <p className="text-sm text-gray-600">Holidays</p>
                      </div>
                      <div className="bg-purple-50 rounded-lg p-4 text-center">
                        <p className="text-2xl font-bold text-purple-600">{workingDaysInfo.weekends}</p>
                        <p className="text-sm text-gray-600">Weekends</p>
                      </div>
                    </div>

                    {/* Holidays List */}
                    {workingDaysInfo.holidays && workingDaysInfo.holidays.length > 0 && (
                      <div className="bg-orange-50 rounded-lg p-4">
                        <h3 className="text-lg font-semibold text-gray-900 mb-3">Government Holidays</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {workingDaysInfo.holidays.map((holiday, index) => (
                            <div key={index} className="bg-white rounded-lg p-3 flex justify-between items-center">
                              <span className="font-medium text-gray-700">{holiday.name}</span>
                              <span className="text-sm text-gray-500">{formatDate(holiday.date)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Calendar Calculation */}
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h3 className="text-lg font-semibold text-gray-900 mb-3">Working Days Calculation</h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>Total days in month:</span>
                          <span className="font-medium">{workingDaysInfo.totalDays}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Minus weekends:</span>
                          <span className="font-medium">-{workingDaysInfo.weekends}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Minus holidays:</span>
                          <span className="font-medium">-{workingDaysInfo.holidayCount}</span>
                        </div>
                        <div className="border-t pt-2 flex justify-between font-bold">
                          <span>Working days:</span>
                          <span className="text-green-600">{workingDaysInfo.workingDays}</span>
                        </div>
                        <div className="flex justify-between font-bold text-blue-600">
                          <span>Required working days (max 27):</span>
                          <span>{workingDaysInfo.requiredWorkingDays}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Detailed Breakdown Tab */}
                {activeTab === 'breakdown' && calculationDetails?.salaryBreakdown && (
                  <div className="space-y-6">
                    {/* Salary Components */}
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Salary Components</h3>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center py-2 border-b border-gray-200">
                          <span className="text-gray-700">Base Salary:</span>
                          <span className="font-medium">{formatCurrency(calculationDetails.salaryBreakdown.baseSalary)}</span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-gray-200">
                          <span className="text-gray-700">Daily Rate:</span>
                          <span className="font-medium">₹{calculationDetails.salaryBreakdown.dailyRate}</span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-gray-200">
                          <span className="text-gray-700">Days Worked:</span>
                          <span className="font-medium">{calculationDetails.salaryBreakdown.daysWorked} days</span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-gray-200">
                          <span className="text-gray-700">Hours Worked:</span>
                          <span className="font-medium">{calculationDetails.salaryBreakdown.hoursWorked} hours</span>
                        </div>
                        <div className="flex justify-between items-center py-2 bg-blue-50 px-3 rounded">
                          <span className="font-medium text-gray-900">Calculated Salary:</span>
                          <span className="font-bold text-blue-600">{formatCurrency(calculationDetails.calculatedSalary)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Validation Warnings */}
                    {employee?.validationWarnings && employee.validationWarnings.length > 0 && (
                      <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
                        <div className="flex items-center space-x-2 mb-3">
                          <AlertTriangle className="w-5 h-5 text-yellow-600" />
                          <h3 className="text-lg font-semibold text-yellow-800">Validation Warnings</h3>
                        </div>
                        <ul className="space-y-1">
                          {employee.validationWarnings.map((warning, index) => (
                            <li key={index} className="text-sm text-yellow-700 flex items-center space-x-2">
                              <span className="w-1 h-1 bg-yellow-600 rounded-full"></span>
                              <span>{warning}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Days Present Comparison with Configurable Divisors */}
                    <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                      <h3 className="text-lg font-semibold text-purple-900 mb-4 flex items-center">
                        <Users className="w-5 h-5 mr-2" />
                        Days Calculation Methods Comparison
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-white rounded-lg p-4">
                          <h4 className="font-medium text-gray-900 mb-2">Actual Days (From File)</h4>
                          <div className="space-y-1 text-sm">
                            <div className="flex justify-between">
                              <span>Days marked as present:</span>
                              <span className="font-bold text-purple-600">{employee?.actualDaysPresent || employee?.daysPresent} days</span>
                            </div>
                            <p className="text-xs text-gray-600 mt-2">
                              Direct count from uploaded Excel/CSV file based on attendance markings.
                            </p>
                          </div>
                        </div>
                        <div className="bg-white rounded-lg p-4">
                          <h4 className="font-medium text-gray-900 mb-2">Working Days (For Salary)</h4>
                          <div className="space-y-1 text-sm">
                            <div className="flex justify-between">
                              <span>Total hours worked:</span>
                              <span>{employee?.hoursWorked}h</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Hours ÷ {employee?.attendanceBreakdown?.hoursToSalaryDivisor || employee?.hoursToSalaryDivisor || 8} (salary divisor):</span>
                              <span className="font-bold text-blue-600">
                                {employee?.calculatedWorkingDays || employee?.calculatedDaysPresent || 
                                 Math.round((employee?.hoursWorked / (employee?.attendanceBreakdown?.hoursToSalaryDivisor || employee?.hoursToSalaryDivisor || 8)) * 100) / 100} days
                              </span>
                            </div>
                            <p className="text-xs text-gray-600 mt-2">
                              Used for salary calculation. Divides total hours by {employee?.attendanceBreakdown?.hoursToSalaryDivisor || employee?.hoursToSalaryDivisor || 8} hours per working day.
                            </p>
                          </div>
                        </div>
                        <div className="bg-white rounded-lg p-4">
                          <h4 className="font-medium text-gray-900 mb-2">Calendar Days (Total)</h4>
                          <div className="space-y-1 text-sm">
                            <div className="flex justify-between">
                              <span>Total hours worked:</span>
                              <span>{employee?.hoursWorked}h</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Hours ÷ {employee?.attendanceBreakdown?.hoursToDaysDivisor || employee?.hoursToDaysDivisor || 24} (calendar divisor):</span>
                              <span className="font-bold text-green-600">
                                {employee?.calculatedCalendarDays || 
                                 Math.round((employee?.hoursWorked / (employee?.attendanceBreakdown?.hoursToDaysDivisor || employee?.hoursToDaysDivisor || 24)) * 100) / 100} days
                              </span>
                            </div>
                            <p className="text-xs text-gray-600 mt-2">
                              Total calendar days equivalent. Divides total hours by {employee?.attendanceBreakdown?.hoursToDaysDivisor || employee?.hoursToDaysDivisor || 24} hours per calendar day.
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      {/* Configuration Display */}
                      <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <div className="flex items-center space-x-2 mb-1">
                          <Calculator className="w-4 h-4 text-blue-600" />
                          <span className="text-sm font-medium text-blue-900">Configuration Used</span>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-xs text-blue-700">
                          <div>
                            <span className="font-medium">Salary Divisor:</span> {employee?.attendanceBreakdown?.hoursToSalaryDivisor || employee?.hoursToSalaryDivisor || 8} hours
                          </div>
                          <div>
                            <span className="font-medium">Calendar Divisor:</span> {employee?.attendanceBreakdown?.hoursToDaysDivisor || employee?.hoursToDaysDivisor || 24} hours
                          </div>
                        </div>
                        <p className="text-xs text-blue-600 mt-2">
                          These divisors are configurable via environment variables (HOURS_TO_SALARY_DIVISOR and HOURS_TO_DAYS_DIVISOR).
                        </p>
                      </div>
                    </div>

                    {/* Detailed Attendance Listing */}
                    {employee?.attendanceBreakdown?.attendanceList && employee.attendanceBreakdown.attendanceList.length > 0 && (
                      <div className="bg-gray-50 rounded-lg p-4">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                          <Calendar className="w-5 h-5 mr-2" />
                          Complete Attendance Record ({employee.attendanceBreakdown.attendanceList.length} entries)
                        </h3>
                        <div className="max-h-80 overflow-y-auto">
                          <div className="space-y-2">
                            {employee.attendanceBreakdown.attendanceList.map((attendance, index) => (
                              <div key={index} className={`p-3 rounded-lg border ${attendance.status === 'Present' 
                                ? 'bg-green-50 border-green-200' 
                                : attendance.status === 'Half Day' 
                                ? 'bg-yellow-50 border-yellow-200' 
                                : 'bg-red-50 border-red-200'
                              }`}>
                                <div className="flex justify-between items-center">
                                  <div className="flex items-center space-x-3">
                                    <div className="flex flex-col">
                                      <span className="font-medium text-gray-900">
                                        {attendance.formattedDate || new Date(attendance.date).toLocaleDateString('en-IN', {
                                          day: 'numeric',
                                          month: 'short',
                                          year: 'numeric'
                                        })}
                                      </span>
                                      <span className="text-xs text-gray-500">
                                        {attendance.dayName || new Date(attendance.date).toLocaleDateString('en-IN', { weekday: 'long' })}
                                        {attendance.isWeekend && ' (Weekend)'}
                                      </span>
                                    </div>
                                    <div className="flex flex-col text-sm">
                                      <span className="text-gray-700">
                                        {attendance.checkIn && attendance.checkOut 
                                          ? `${attendance.checkIn} - ${attendance.checkOut}`
                                          : attendance.checkIn 
                                          ? `${attendance.checkIn} (No checkout)`
                                          : 'No time recorded'
                                        }
                                      </span>
                                      <span className="text-xs text-gray-500">
                                        {attendance.hoursWorked > 0 ? `${attendance.hoursWorked}h worked` : 'No hours'}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                      attendance.status === 'Present' 
                                        ? 'bg-green-100 text-green-800'
                                        : attendance.status === 'Half Day'
                                        ? 'bg-yellow-100 text-yellow-800'
                                        : 'bg-red-100 text-red-800'
                                    }`}>
                                      {attendance.status}
                                    </span>
                                    {attendance.status === 'Present' && <CheckCircle className="w-4 h-4 text-green-600" />}
                                    {attendance.status === 'Half Day' && <AlertTriangle className="w-4 h-4 text-yellow-600" />}
                                    {attendance.status === 'Absent' && <Info className="w-4 h-4 text-red-600" />}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                        
                        {/* Attendance Summary Footer */}
                        <div className="mt-4 pt-4 border-t border-gray-200">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center text-sm">
                            <div>
                              <p className="font-medium text-green-600">
                                {employee.attendanceBreakdown.attendanceList.filter(a => a.status === 'Present').length}
                              </p>
                              <p className="text-gray-600">Full Days</p>
                            </div>
                            <div>
                              <p className="font-medium text-yellow-600">
                                {employee.attendanceBreakdown.attendanceList.filter(a => a.status === 'Half Day').length}
                              </p>
                              <p className="text-gray-600">Half Days</p>
                            </div>
                            <div>
                              <p className="font-medium text-red-600">
                                {employee.attendanceBreakdown.attendanceList.filter(a => a.status === 'Absent').length}
                              </p>
                              <p className="text-gray-600">Absent Days</p>
                            </div>
                            <div>
                              <p className="font-medium text-blue-600">
                                {employee.attendanceBreakdown.totalHoursWorked}h
                              </p>
                              <p className="text-gray-600">Total Hours</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Additional Information */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-blue-50 rounded-lg p-4">
                        <h4 className="font-medium text-blue-900 mb-2">Time Efficiency</h4>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span>Expected hours:</span>
                            <span>{calculationDetails.expectedTotalHours}h</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Actual hours:</span>
                            <span>{calculationDetails.hoursWorked}h</span>
                          </div>
                          <div className="flex justify-between font-medium">
                            <span>Efficiency:</span>
                            <span>{Math.round(calculationDetails.hoursPercentage)}%</span>
                          </div>
                        </div>
                      </div>
                      <div className="bg-green-50 rounded-lg p-4">
                        <h4 className="font-medium text-green-900 mb-2">Attendance Summary</h4>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span>Required days:</span>
                            <span>{calculationDetails.requiredDays}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Present days:</span>
                            <span>{calculationDetails.daysPresent}</span>
                          </div>
                          <div className="flex justify-between font-medium">
                            <span>Attendance:</span>
                            <span>{Math.round(calculationDetails.attendancePercentage)}%</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-gray-200 px-6 py-4 bg-gray-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <Info className="w-4 h-4" />
                <span>Calculation based on government holidays and working days for {monthYear || employee?.monthYear}</span>
              </div>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default SalaryExplanationModal;