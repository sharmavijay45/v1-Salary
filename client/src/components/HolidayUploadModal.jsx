import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Calendar, Plus, Trash2, Save, X, 
  AlertCircle, CheckCircle, Coffee, Sun 
} from 'lucide-react';
import { addHolidays } from '../api';
import toast from 'react-hot-toast';

const HolidayUploadModal = ({ isOpen, onClose, monthYear, onHolidaysAdded }) => {
  const [holidays, setHolidays] = useState([
    { date: '', name: '', description: '', type: 'company' }
  ]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && monthYear) {
      // Pre-populate with common holidays for the month
      const month = parseInt(monthYear.split('-')[1]);
      const year = parseInt(monthYear.split('-')[0]);
      
      const commonHolidays = getCommonHolidays(month, year);
      if (commonHolidays.length > 0) {
        setHolidays([...commonHolidays, { date: '', name: '', description: '', type: 'company' }]);
      }
    }
  }, [isOpen, monthYear]);

  const getCommonHolidays = (month, year) => {
    const holidays = [];
    
    // Add common Indian holidays based on month
    switch (month) {
      case 1: // January
        holidays.push({ date: `${year}-01-26`, name: 'Republic Day', description: 'National Holiday', type: 'government' });
        break;
      case 8: // August
        holidays.push({ date: `${year}-08-15`, name: 'Independence Day', description: 'National Holiday', type: 'government' });
        break;
      case 10: // October
        holidays.push({ date: `${year}-10-02`, name: 'Gandhi Jayanti', description: 'National Holiday', type: 'government' });
        break;
      default:
        break;
    }
    
    return holidays;
  };

  const addHolidayRow = () => {
    setHolidays([...holidays, { date: '', name: '', description: '', type: 'company' }]);
  };

  const removeHolidayRow = (index) => {
    if (holidays.length > 1) {
      setHolidays(holidays.filter((_, i) => i !== index));
    }
  };

  const updateHoliday = (index, field, value) => {
    const updated = [...holidays];
    updated[index][field] = value;
    setHolidays(updated);
  };

  const handleSaveHolidays = async () => {
    try {
      const validHolidays = holidays.filter(h => h.date && h.name);
      
      if (validHolidays.length === 0) {
        toast.error('Please add at least one valid holiday');
        return;
      }

      setLoading(true);
      await addHolidays(validHolidays, monthYear);
      
      toast.success(`Added ${validHolidays.length} holidays successfully`);
      
      if (onHolidaysAdded) {
        onHolidaysAdded(validHolidays);
      }
      
      onClose();
    } catch (error) {
      console.error('Error adding holidays:', error);
      toast.error('Failed to add holidays');
    } finally {
      setLoading(false);
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'government':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'festival':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'company':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Calendar className="w-6 h-6" />
                <div>
                  <h3 className="text-xl font-bold">Add Holidays for {monthYear}</h3>
                  <p className="text-blue-100">These holidays will be added to working days calculation</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="text-white/80 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            {/* Information Box */}
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start space-x-3">
                <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                <div className="text-sm text-blue-800">
                  <p className="font-medium mb-1">How Holiday Calculation Works:</p>
                  <ul className="space-y-1 text-xs">
                    <li>• If an employee worked 20 days and you add 5 holidays, their effective working days become 25</li>
                    <li>• Salary calculation: (25 working days / 26 total working days) × Base Salary</li>
                    <li>• Hours worked and present days remain unchanged in records</li>
                    <li>• Only the salary calculation benefits from holiday adjustment</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Holiday Form */}
            <div className="space-y-4">
              <h4 className="text-lg font-semibold text-gray-900 mb-4">Add Holidays</h4>
              
              {holidays.map((holiday, index) => (
                <div key={index} className="grid grid-cols-1 md:grid-cols-5 gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                    <input
                      type="date"
                      value={holiday.date}
                      onChange={(e) => updateHoliday(index, 'date', e.target.value)}
                      min={`${monthYear}-01`}
                      max={`${monthYear}-31`}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Holiday Name</label>
                    <input
                      type="text"
                      value={holiday.name}
                      onChange={(e) => updateHoliday(index, 'name', e.target.value)}
                      placeholder="e.g., Diwali, Christmas"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <input
                      type="text"
                      value={holiday.description}
                      onChange={(e) => updateHoliday(index, 'description', e.target.value)}
                      placeholder="Optional description"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                    <select
                      value={holiday.type}
                      onChange={(e) => updateHoliday(index, 'type', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="company">Company Holiday</option>
                      <option value="government">Government Holiday</option>
                      <option value="festival">Festival</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  
                  <div className="flex items-end space-x-2">
                    {holidays.length > 1 && (
                      <button
                        onClick={() => removeHolidayRow(index)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Remove holiday"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                    {index === holidays.length - 1 && (
                      <button
                        onClick={addHolidayRow}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Add another holiday"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Preview */}
            {holidays.filter(h => h.date && h.name).length > 0 && (
              <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                <h5 className="text-sm font-medium text-green-900 mb-2 flex items-center">
                  <CheckCircle className="w-4 h-4 mr-1" />
                  Holidays to be Added ({holidays.filter(h => h.date && h.name).length})
                </h5>
                <div className="space-y-2">
                  {holidays
                    .filter(h => h.date && h.name)
                    .map((holiday, index) => (
                      <div key={index} className="flex items-center justify-between bg-white rounded p-2 text-sm">
                        <div className="flex items-center space-x-3">
                          <span className="font-medium text-gray-900">{holiday.name}</span>
                          <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getTypeColor(holiday.type)}`}>
                            {holiday.type.charAt(0).toUpperCase() + holiday.type.slice(1)}
                          </span>
                        </div>
                        <span className="text-gray-600">
                          {new Date(holiday.date).toLocaleDateString('en-IN', {
                            weekday: 'short',
                            day: 'numeric',
                            month: 'short'
                          })}
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3 mt-8">
              <button
                onClick={onClose}
                className="px-6 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Skip Holidays
              </button>
              <button
                onClick={handleSaveHolidays}
                disabled={loading || holidays.filter(h => h.date && h.name).length === 0}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <Save className="w-4 h-4" />
                )}
                <span>{loading ? 'Saving...' : 'Save Holidays & Continue'}</span>
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default HolidayUploadModal;