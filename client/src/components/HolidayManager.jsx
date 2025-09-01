import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Calendar, Plus, Trash2, Edit3, Save, X, 
  AlertCircle, CheckCircle, Coffee, Sun 
} from 'lucide-react';
import { addHolidays, getHolidays, updateHoliday, deleteHoliday } from '../api';
import toast from 'react-hot-toast';

const HolidayManager = ({ monthYear, onHolidaysUpdate }) => {
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState(null);
  const [newHolidays, setNewHolidays] = useState([
    { date: '', name: '', description: '', type: 'company' }
  ]);

  useEffect(() => {
    if (monthYear) {
      fetchHolidays();
    }
  }, [monthYear]);

  const fetchHolidays = async () => {
    try {
      setLoading(true);
      const response = await getHolidays(monthYear);
      setHolidays(response.holidays || []);
    } catch (error) {
      console.error('Error fetching holidays:', error);
      toast.error('Failed to fetch holidays');
    } finally {
      setLoading(false);
    }
  };

  const handleAddHolidays = async () => {
    try {
      const validHolidays = newHolidays.filter(h => h.date && h.name);
      
      if (validHolidays.length === 0) {
        toast.error('Please add at least one valid holiday');
        return;
      }

      setLoading(true);
      await addHolidays(validHolidays, monthYear);
      
      toast.success(`Added ${validHolidays.length} holidays successfully`);
      setShowAddForm(false);
      setNewHolidays([{ date: '', name: '', description: '', type: 'company' }]);
      fetchHolidays();
      
      if (onHolidaysUpdate) {
        onHolidaysUpdate();
      }
    } catch (error) {
      console.error('Error adding holidays:', error);
      toast.error('Failed to add holidays');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateHoliday = async (holidayId, updatedData) => {
    try {
      await updateHoliday(holidayId, updatedData);
      toast.success('Holiday updated successfully');
      setEditingHoliday(null);
      fetchHolidays();
      
      if (onHolidaysUpdate) {
        onHolidaysUpdate();
      }
    } catch (error) {
      console.error('Error updating holiday:', error);
      toast.error('Failed to update holiday');
    }
  };

  const handleDeleteHoliday = async (holidayId) => {
    if (!confirm('Are you sure you want to delete this holiday?')) {
      return;
    }

    try {
      await deleteHoliday(holidayId);
      toast.success('Holiday deleted successfully');
      fetchHolidays();
      
      if (onHolidaysUpdate) {
        onHolidaysUpdate();
      }
    } catch (error) {
      console.error('Error deleting holiday:', error);
      toast.error('Failed to delete holiday');
    }
  };

  const addNewHolidayRow = () => {
    setNewHolidays([...newHolidays, { date: '', name: '', description: '', type: 'company' }]);
  };

  const removeHolidayRow = (index) => {
    setNewHolidays(newHolidays.filter((_, i) => i !== index));
  };

  const updateNewHoliday = (index, field, value) => {
    const updated = [...newHolidays];
    updated[index][field] = value;
    setNewHolidays(updated);
  };

  const getHolidayIcon = (type) => {
    switch (type) {
      case 'government':
        return <Sun className="w-4 h-4 text-orange-500" />;
      case 'festival':
        return <Coffee className="w-4 h-4 text-purple-500" />;
      default:
        return <Calendar className="w-4 h-4 text-blue-500" />;
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

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden"
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Calendar className="w-6 h-6" />
            <div>
              <h3 className="text-xl font-bold">Holiday Management</h3>
              <p className="text-blue-100">Manage holidays for {monthYear}</p>
            </div>
          </div>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg transition-colors flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>Add Holidays</span>
          </button>
        </div>
      </div>

      {/* Add Holiday Form */}
      <AnimatePresence>
        {showAddForm && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-b border-gray-200 bg-gray-50"
          >
            <div className="p-6">
              <h4 className="text-lg font-semibold text-gray-900 mb-4">Add New Holidays</h4>
              
              <div className="space-y-4">
                {newHolidays.map((holiday, index) => (
                  <div key={index} className="grid grid-cols-1 md:grid-cols-5 gap-4 p-4 bg-white rounded-lg border border-gray-200">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                      <input
                        type="date"
                        value={holiday.date}
                        onChange={(e) => updateNewHoliday(index, 'date', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Holiday Name</label>
                      <input
                        type="text"
                        value={holiday.name}
                        onChange={(e) => updateNewHoliday(index, 'name', e.target.value)}
                        placeholder="e.g., Diwali, Christmas"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                      <input
                        type="text"
                        value={holiday.description}
                        onChange={(e) => updateNewHoliday(index, 'description', e.target.value)}
                        placeholder="Optional description"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                      <select
                        value={holiday.type}
                        onChange={(e) => updateNewHoliday(index, 'type', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="company">Company Holiday</option>
                        <option value="government">Government Holiday</option>
                        <option value="festival">Festival</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    
                    <div className="flex items-end space-x-2">
                      {newHolidays.length > 1 && (
                        <button
                          onClick={() => removeHolidayRow(index)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                      {index === newHolidays.length - 1 && (
                        <button
                          onClick={addNewHolidayRow}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => {
                    setShowAddForm(false);
                    setNewHolidays([{ date: '', name: '', description: '', type: 'company' }]);
                  }}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddHolidays}
                  disabled={loading}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center space-x-2"
                >
                  {loading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  <span>Save Holidays</span>
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Holidays List */}
      <div className="p-6">
        {loading && !showAddForm ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-gray-600">Loading holidays...</span>
          </div>
        ) : holidays.length === 0 ? (
          <div className="text-center py-8">
            <Calendar className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Holidays Added</h3>
            <p className="text-gray-600 mb-4">
              Add holidays for {monthYear} to ensure accurate working days calculation.
            </p>
            <button
              onClick={() => setShowAddForm(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Add First Holiday
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-semibold text-gray-900">
                Holidays for {monthYear} ({holidays.length})
              </h4>
              <div className="text-sm text-gray-600">
                These holidays will be excluded from working days calculation
              </div>
            </div>
            
            {holidays.map((holiday) => (
              <motion.div
                key={holiday._id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center space-x-4">
                  {getHolidayIcon(holiday.type)}
                  <div>
                    <div className="flex items-center space-x-3">
                      <h5 className="font-medium text-gray-900">{holiday.name}</h5>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getTypeColor(holiday.type)}`}>
                        {holiday.type.charAt(0).toUpperCase() + holiday.type.slice(1)}
                      </span>
                    </div>
                    <div className="flex items-center space-x-4 mt-1">
                      <span className="text-sm text-gray-600">
                        {new Date(holiday.date).toLocaleDateString('en-IN', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </span>
                      {holiday.description && (
                        <span className="text-sm text-gray-500">• {holiday.description}</span>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setEditingHoliday(holiday)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Edit holiday"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteHoliday(holiday._id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete holiday"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Edit Holiday Modal */}
      <AnimatePresence>
        {editingHoliday && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setEditingHoliday(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-xl p-6 max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-lg font-bold text-gray-900">Edit Holiday</h4>
                <button
                  onClick={() => setEditingHoliday(null)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Holiday Name</label>
                  <input
                    type="text"
                    value={editingHoliday.name}
                    onChange={(e) => setEditingHoliday({...editingHoliday, name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <input
                    type="text"
                    value={editingHoliday.description || ''}
                    onChange={(e) => setEditingHoliday({...editingHoliday, description: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                  <select
                    value={editingHoliday.type}
                    onChange={(e) => setEditingHoliday({...editingHoliday, type: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="company">Company Holiday</option>
                    <option value="government">Government Holiday</option>
                    <option value="festival">Festival</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setEditingHoliday(null)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleUpdateHoliday(editingHoliday._id, {
                    name: editingHoliday.name,
                    description: editingHoliday.description,
                    type: editingHoliday.type
                  })}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
                >
                  <Save className="w-4 h-4" />
                  <span>Update Holiday</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default HolidayManager;