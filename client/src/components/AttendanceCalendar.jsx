import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Calendar, Clock, CheckCircle, XCircle, 
  AlertCircle, ChevronLeft, ChevronRight,
  Sun, CloudRain, Coffee
} from 'lucide-react';
import moment from 'moment';

const AttendanceCalendar = ({ attendanceData, workingDaysInfo, monthYear }) => {
  const [currentDate, setCurrentDate] = useState(moment(monthYear || new Date()));
  const [calendarDays, setCalendarDays] = useState([]);
  const [selectedDay, setSelectedDay] = useState(null);

  useEffect(() => {
    generateCalendar();
  }, [currentDate, attendanceData, workingDaysInfo]);

  const generateCalendar = () => {
    const startOfMonth = currentDate.clone().startOf('month');
    const endOfMonth = currentDate.clone().endOf('month');
    const startOfCalendar = startOfMonth.clone().startOf('week');
    const endOfCalendar = endOfMonth.clone().endOf('week');

    const days = [];
    let current = startOfCalendar.clone();

    while (current.isSameOrBefore(endOfCalendar)) {
      const dayData = getDayData(current);
      days.push({
        date: current.clone(),
        dayData,
        isCurrentMonth: current.month() === currentDate.month(),
        isToday: current.isSame(moment(), 'day')
      });
      current.add(1, 'day');
    }

    setCalendarDays(days);
  };

  const getDayData = (date) => {
    const dateString = date.format('YYYY-MM-DD');
    
    // Find attendance record for this date
    const attendanceRecord = attendanceData?.attendanceDetails?.find(
      record => record.date === dateString
    );

    // Check if it's a Sunday
    const isSunday = date.day() === 0;
    
    // Check if it's a holiday
    const isHoliday = workingDaysInfo?.holidays?.some(
      holiday => holiday.date === dateString
    );

    // Determine day type and status
    let dayType = 'working';
    let status = 'absent';
    let hoursWorked = 0;
    let checkIn = '';
    let checkOut = '';

    if (isSunday) {
      dayType = 'sunday';
    } else if (isHoliday) {
      dayType = 'holiday';
    }

    if (attendanceRecord) {
      status = attendanceRecord.status?.toLowerCase() || 'absent';
      hoursWorked = attendanceRecord.hoursWorked || 0;
      checkIn = attendanceRecord.checkIn || '';
      checkOut = attendanceRecord.checkOut || '';
    }

    return {
      dayType,
      status,
      hoursWorked,
      checkIn,
      checkOut,
      isHoliday: isHoliday ? workingDaysInfo.holidays.find(h => h.date === dateString) : null
    };
  };

  const getStatusColor = (dayData, isCurrentMonth) => {
    if (!isCurrentMonth) return 'bg-gray-50 text-gray-300';
    
    switch (dayData.dayType) {
      case 'sunday':
        return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'holiday':
        return 'bg-orange-100 text-orange-700 border-orange-200';
      default:
        switch (dayData.status) {
          case 'present':
            return 'bg-green-100 text-green-800 border-green-200 hover:bg-green-200';
          case 'half day':
            return 'bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-200';
          case 'absent':
            return dayData.dayType === 'working' 
              ? 'bg-red-100 text-red-800 border-red-200 hover:bg-red-200'
              : 'bg-gray-100 text-gray-600 border-gray-200';
          default:
            return 'bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200';
        }
    }
  };

  const getStatusIcon = (dayData) => {
    switch (dayData.dayType) {
      case 'sunday':
        return <Sun className="w-3 h-3" />;
      case 'holiday':
        return <Coffee className="w-3 h-3" />;
      default:
        switch (dayData.status) {
          case 'present':
            return <CheckCircle className="w-3 h-3" />;
          case 'half day':
            return <AlertCircle className="w-3 h-3" />;
          case 'absent':
            return dayData.dayType === 'working' ? <XCircle className="w-3 h-3" /> : null;
          default:
            return null;
        }
    }
  };

  const navigateMonth = (direction) => {
    setCurrentDate(prev => prev.clone().add(direction, 'month'));
  };

  const getMonthSummary = () => {
    if (!attendanceData?.attendanceDetails) return null;

    const totalPresent = attendanceData.attendanceDetails.filter(
      record => record.status?.toLowerCase() === 'present'
    ).length;

    const totalHalfDay = attendanceData.attendanceDetails.filter(
      record => record.status?.toLowerCase() === 'half day'
    ).length;

    const totalAbsent = attendanceData.attendanceDetails.filter(
      record => record.status?.toLowerCase() === 'absent'
    ).length;

    const totalHours = attendanceData.hoursWorked || 0;
    const workingDays = workingDaysInfo?.workingDays || 26;

    return {
      totalPresent,
      totalHalfDay,
      totalAbsent,
      totalHours,
      workingDays,
      attendanceRate: ((totalPresent + totalHalfDay * 0.5) / workingDays * 100).toFixed(1)
    };
  };

  const summary = getMonthSummary();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden"
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold flex items-center">
            <Calendar className="w-6 h-6 mr-2" />
            Attendance Calendar
          </h3>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => navigateMonth(-1)}
              className="p-1 hover:bg-white/20 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="text-lg font-semibold min-w-[140px] text-center">
              {currentDate.format('MMMM YYYY')}
            </span>
            <button
              onClick={() => navigateMonth(1)}
              className="p-1 hover:bg-white/20 rounded-lg transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Summary Stats */}
        {summary && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="bg-white/20 rounded-lg p-2 text-center">
              <div className="font-bold text-lg">{summary.totalPresent}</div>
              <div className="text-xs opacity-90">Present Days</div>
            </div>
            <div className="bg-white/20 rounded-lg p-2 text-center">
              <div className="font-bold text-lg">{summary.totalHours}h</div>
              <div className="text-xs opacity-90">Total Hours</div>
            </div>
            <div className="bg-white/20 rounded-lg p-2 text-center">
              <div className="font-bold text-lg">{summary.attendanceRate}%</div>
              <div className="text-xs opacity-90">Attendance</div>
            </div>
            <div className="bg-white/20 rounded-lg p-2 text-center">
              <div className="font-bold text-lg">{summary.workingDays}</div>
              <div className="text-xs opacity-90">Working Days</div>
            </div>
          </div>
        )}
      </div>

      {/* Calendar Grid */}
      <div className="p-4">
        {/* Week Headers */}
        <div className="grid grid-cols-7 gap-2 mb-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="text-center text-sm font-medium text-gray-500 py-2">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Days */}
        <div className="grid grid-cols-7 gap-2">
          {calendarDays.map((day, index) => (
            <motion.div
              key={index}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setSelectedDay(day)}
              className={`
                relative p-2 min-h-[60px] border-2 rounded-lg cursor-pointer transition-all duration-200
                ${getStatusColor(day.dayData, day.isCurrentMonth)}
                ${day.isToday ? 'ring-2 ring-blue-500 ring-offset-1' : ''}
              `}
            >
              <div className="flex flex-col h-full">
                <div className="flex items-center justify-between">
                  <span className={`text-sm font-medium ${day.isCurrentMonth ? '' : 'opacity-50'}`}>
                    {day.date.format('D')}
                  </span>
                  {getStatusIcon(day.dayData)}
                </div>
                
                {day.isCurrentMonth && day.dayData.hoursWorked > 0 && (
                  <div className="mt-1 text-xs font-medium">
                    {day.dayData.hoursWorked}h
                  </div>
                )}

                {day.dayData.isHoliday && (
                  <div className="mt-1 text-xs opacity-75 truncate">
                    {day.dayData.isHoliday.name}
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Legend */}
        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-green-100 border-2 border-green-200 rounded"></div>
            <span>Present</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-yellow-100 border-2 border-yellow-200 rounded"></div>
            <span>Half Day</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-red-100 border-2 border-red-200 rounded"></div>
            <span>Absent</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-purple-100 border-2 border-purple-200 rounded"></div>
            <span>Sunday</span>
          </div>
        </div>
      </div>

      {/* Day Detail Modal */}
      {selectedDay && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedDay(null)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-xl p-6 max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-bold">
                {selectedDay.date.format('dddd, MMMM D, YYYY')}
              </h4>
              <button
                onClick={() => setSelectedDay(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Status:</span>
                <span className={`px-3 py-1 rounded-full text-sm font-medium
                  ${selectedDay.dayData.status === 'present' ? 'bg-green-100 text-green-800' :
                    selectedDay.dayData.status === 'half day' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'}`}>
                  {selectedDay.dayData.status?.toUpperCase() || 'ABSENT'}
                </span>
              </div>

              {selectedDay.dayData.checkIn && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Check In:</span>
                  <span className="font-medium">{selectedDay.dayData.checkIn}</span>
                </div>
              )}

              {selectedDay.dayData.checkOut && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Check Out:</span>
                  <span className="font-medium">{selectedDay.dayData.checkOut}</span>
                </div>
              )}

              <div className="flex items-center justify-between">
                <span className="text-gray-600">Hours Worked:</span>
                <span className="font-medium flex items-center">
                  <Clock className="w-4 h-4 mr-1" />
                  {selectedDay.dayData.hoursWorked}h
                </span>
              </div>

              {selectedDay.dayData.isHoliday && (
                <div className="bg-orange-50 p-3 rounded-lg">
                  <div className="flex items-center text-orange-800">
                    <Coffee className="w-4 h-4 mr-2" />
                    <span className="font-medium">Holiday: {selectedDay.dayData.isHoliday.name}</span>
                  </div>
                </div>
              )}

              {selectedDay.dayData.dayType === 'sunday' && (
                <div className="bg-purple-50 p-3 rounded-lg">
                  <div className="flex items-center text-purple-800">
                    <Sun className="w-4 h-4 mr-2" />
                    <span className="font-medium">Sunday - Non-working day</span>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </motion.div>
  );
};

export default AttendanceCalendar;