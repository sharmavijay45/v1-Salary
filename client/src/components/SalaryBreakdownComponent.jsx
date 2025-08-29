import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calculator, Calendar, Clock, DollarSign, 
  Info, ChevronDown, ChevronUp, Zap,
  TrendingUp, AlertCircle, CheckCircle
} from 'lucide-react';

const SalaryBreakdownComponent = ({ userData, isVisible = true }) => {
  const [expandedSection, setExpandedSection] = useState(null);

  if (!userData || !userData.salaryBreakdown) {
    return null;
  }

  const { salaryBreakdown, workingDaysInfo, calculationMethod } = userData;

  const toggleSection = (section) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const getCalculationMethodInfo = () => {
    switch (calculationMethod) {
      case 'daily_wage':
        return {
          title: 'Daily Wage Calculation',
          icon: Calculator,
          color: 'text-blue-600',
          bgColor: 'bg-blue-50',
          description: 'Salary calculated based on days worked × daily wage rate'
        };
      case 'proportional':
        return {
          title: 'Proportional Calculation',
          icon: TrendingUp,
          color: 'text-green-600',
          bgColor: 'bg-green-50',
          description: 'Salary calculated proportionally based on attendance ratio'
        };
      default:
        return {
          title: 'Standard Calculation',
          icon: Calculator,
          color: 'text-gray-600',
          bgColor: 'bg-gray-50',
          description: 'Standard salary calculation method'
        };
    }
  };

  const methodInfo = getCalculationMethodInfo();
  const MethodIcon = methodInfo.icon;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden"
        >
          {/* Header */}
          <div className={`${methodInfo.bgColor} px-6 py-4 border-b border-gray-200`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className={`p-2 ${methodInfo.bgColor} rounded-lg`}>
                  <MethodIcon className={`w-6 h-6 ${methodInfo.color}`} />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{methodInfo.title}</h3>
                  <p className="text-sm text-gray-600">{methodInfo.description}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(userData.adjustedSalary)}
                </p>
                <p className="text-sm text-gray-500">Final Salary</p>
              </div>
            </div>
          </div>

          {/* Main Calculation Formula */}
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
            <div className="flex items-center space-x-2 mb-2">
              <Zap className="w-5 h-5 text-yellow-500" />
              <span className="font-medium text-gray-900">Calculation Formula</span>
            </div>
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <code className="text-sm font-mono text-gray-700">
                {salaryBreakdown.calculationFormula}
              </code>
            </div>
          </div>

          {/* Breakdown Sections */}
          <div className="space-y-0">
            {/* Working Days Section */}
            <div className="border-b border-gray-200">
              <button
                onClick={() => toggleSection('workingDays')}
                className="w-full px-6 py-4 text-left hover:bg-gray-50 transition-colors duration-200"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Calendar className="w-5 h-5 text-blue-500" />
                    <span className="font-medium text-gray-900">Working Days Breakdown</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-500">
                      {salaryBreakdown.daysWorked}/{salaryBreakdown.requiredWorkingDays} days
                    </span>
                    {expandedSection === 'workingDays' ? (
                      <ChevronUp className="w-4 h-4 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-gray-400" />
                    )}
                  </div>
                </div>
              </button>
              
              <AnimatePresence>
                {expandedSection === 'workingDays' && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="px-6 pb-4 bg-blue-50">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-white rounded-lg p-3 text-center">
                          <p className="text-2xl font-bold text-blue-600">
                            {salaryBreakdown.workingDaysInMonth}
                          </p>
                          <p className="text-xs text-gray-600">Total Working Days</p>
                        </div>
                        <div className="bg-white rounded-lg p-3 text-center">
                          <p className="text-2xl font-bold text-green-600">
                            {Math.round(salaryBreakdown.daysWorked * 10) / 10}
                          </p>
                          <p className="text-xs text-gray-600">Days Worked</p>
                        </div>
                        <div className="bg-white rounded-lg p-3 text-center">
                          <p className="text-2xl font-bold text-orange-600">
                            {workingDaysInfo?.holidays?.length || 0}
                          </p>
                          <p className="text-xs text-gray-600">Holidays</p>
                        </div>
                        <div className="bg-white rounded-lg p-3 text-center">
                          <p className="text-2xl font-bold text-purple-600">
                            {Math.round(userData.attendancePercentage)}%
                          </p>
                          <p className="text-xs text-gray-600">Attendance</p>
                        </div>
                      </div>
                      
                      {/* Holidays List */}
                      {workingDaysInfo?.holidays?.length > 0 && (
                        <div className="mt-4">
                          <h5 className="text-sm font-medium text-gray-700 mb-2">Government Holidays This Month:</h5>
                          <div className="bg-white rounded-lg p-3">
                            <div className="space-y-1">
                              {workingDaysInfo.holidays.map((holiday, index) => (
                                <div key={index} className="flex justify-between text-sm">
                                  <span className="text-gray-600">{holiday.name}</span>
                                  <span className="text-gray-500">{holiday.date}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Hours Section */}
            <div className="border-b border-gray-200">
              <button
                onClick={() => toggleSection('hours')}
                className="w-full px-6 py-4 text-left hover:bg-gray-50 transition-colors duration-200"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Clock className="w-5 h-5 text-green-500" />
                    <span className="font-medium text-gray-900">Hours Breakdown</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-500">
                      {userData.hoursWorked}h / {salaryBreakdown.expectedHours}h
                    </span>
                    {expandedSection === 'hours' ? (
                      <ChevronUp className="w-4 h-4 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-gray-400" />
                    )}
                  </div>
                </div>
              </button>
              
              <AnimatePresence>
                {expandedSection === 'hours' && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="px-6 pb-4 bg-green-50">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-white rounded-lg p-3 text-center">
                          <p className="text-2xl font-bold text-green-600">
                            {userData.hoursWorked}
                          </p>
                          <p className="text-xs text-gray-600">Hours Worked</p>
                        </div>
                        <div className="bg-white rounded-lg p-3 text-center">
                          <p className="text-2xl font-bold text-blue-600">
                            {salaryBreakdown.expectedHours}
                          </p>
                          <p className="text-xs text-gray-600">Expected Hours</p>
                        </div>
                        <div className="bg-white rounded-lg p-3 text-center">
                          <p className="text-2xl font-bold text-purple-600">
                            {userData.avgHoursPerDay}
                          </p>
                          <p className="text-xs text-gray-600">Avg Hours/Day</p>
                        </div>
                        <div className="bg-white rounded-lg p-3 text-center">
                          <p className="text-2xl font-bold text-orange-600">
                            {Math.round(userData.hoursPercentage)}%
                          </p>
                          <p className="text-xs text-gray-600">Hours Efficiency</p>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Salary Calculation Section */}
            <div className="border-b border-gray-200">
              <button
                onClick={() => toggleSection('salary')}
                className="w-full px-6 py-4 text-left hover:bg-gray-50 transition-colors duration-200"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <DollarSign className="w-5 h-5 text-purple-500" />
                    <span className="font-medium text-gray-900">Salary Calculation</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-500">
                      ₹{salaryBreakdown.dailyRate}/day
                    </span>
                    {expandedSection === 'salary' ? (
                      <ChevronUp className="w-4 h-4 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-gray-400" />
                    )}
                  </div>
                </div>
              </button>
              
              <AnimatePresence>
                {expandedSection === 'salary' && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="px-6 pb-4 bg-purple-50">
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                          <div className="bg-white rounded-lg p-3 text-center">
                            <p className="text-2xl font-bold text-purple-600">
                              ₹{salaryBreakdown.baseSalary.toLocaleString()}
                            </p>
                            <p className="text-xs text-gray-600">Base Salary</p>
                          </div>
                          <div className="bg-white rounded-lg p-3 text-center">
                            <p className="text-2xl font-bold text-blue-600">
                              ₹{salaryBreakdown.dailyRate}
                            </p>
                            <p className="text-xs text-gray-600">Daily Rate</p>
                          </div>
                          <div className="bg-white rounded-lg p-3 text-center">
                            <p className="text-2xl font-bold text-green-600">
                              ₹{userData.adjustedSalary.toLocaleString()}
                            </p>
                            <p className="text-xs text-gray-600">Final Salary</p>
                          </div>
                        </div>
                        
                        {/* Calculation Steps */}
                        <div className="bg-white rounded-lg p-4 border border-gray-200">
                          <h5 className="text-sm font-medium text-gray-700 mb-3">Calculation Steps:</h5>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                              <span>Working days in month:</span>
                              <span className="font-medium">{salaryBreakdown.workingDaysInMonth} days</span>
                            </div>
                            <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                              <span>Days you worked:</span>
                              <span className="font-medium">{Math.round(salaryBreakdown.daysWorked * 10) / 10} days</span>
                            </div>
                            <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                              <span>Daily rate:</span>
                              <span className="font-medium">₹{salaryBreakdown.dailyRate}</span>
                            </div>
                            <div className="flex justify-between items-center p-2 bg-blue-50 rounded border border-blue-200">
                              <span className="font-medium">Total calculated:</span>
                              <span className="font-bold text-blue-600">₹{userData.adjustedSalary.toLocaleString()}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Footer with Additional Info */}
          <div className="px-6 py-4 bg-gray-50">
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <Info className="w-4 h-4" />
              <span>
                Calculation based on {userData.monthYear} working days excluding weekends and government holidays.
                {userData.userConfig?.hasCustomSalary && (
                  <span className="ml-1 text-blue-600 font-medium">
                    Custom salary configuration applied.
                  </span>
                )}
              </span>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SalaryBreakdownComponent;