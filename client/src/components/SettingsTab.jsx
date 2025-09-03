import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Settings, DollarSign, Clock, Users, Calendar,
  Save, RotateCcw, Database, Shield, Bell,
  Building, Globe, HardDrive, Cpu, BarChart3,
  AlertTriangle, CheckCircle, RefreshCw
} from 'lucide-react';
import { getSettings, updateSettings, resetSettings, getSystemStats, updateUserSalary, bulkUpdateSalaries } from '../api';
import toast from 'react-hot-toast';

function SettingsTab({ 
  settings, 
  setSettings, 
  systemStats, 
  setSystemStats, 
  settingsLoading, 
  setSettingsLoading,
  attendanceData,
  fetchData 
}) {
  const [activeSettingsTab, setActiveSettingsTab] = useState('salary');
  const [tempSettings, setTempSettings] = useState(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [bulkSalaryUpdates, setBulkSalaryUpdates] = useState([]);

  useEffect(() => {
    if (activeSettingsTab === 'settings') {
      fetchSettings();
      fetchSystemStats();
    }
  }, [activeSettingsTab]);

  const fetchSettings = async () => {
    try {
      setSettingsLoading(true);
      const data = await getSettings();
      setSettings(data);
      setTempSettings(data);
    } catch (err) {
      console.error('Error fetching settings:', err);
      toast.error('Failed to load settings');
    } finally {
      setSettingsLoading(false);
    }
  };

  const fetchSystemStats = async () => {
    try {
      const stats = await getSystemStats();
      setSystemStats(stats);
    } catch (err) {
      console.error('Error fetching system stats:', err);
    }
  };

  const handleSettingChange = (key, value) => {
    setTempSettings(prev => ({
      ...prev,
      [key]: value
    }));
    setHasChanges(true);
  };

  const handleSaveSettings = async () => {
    try {
      setSettingsLoading(true);
      const updatedSettings = await updateSettings(tempSettings);
      setSettings(updatedSettings.settings);
      setHasChanges(false);
      toast.success('Settings saved successfully!');
    } catch (err) {
      console.error('Error saving settings:', err);
      toast.error('Failed to save settings');
    } finally {
      setSettingsLoading(false);
    }
  };

  const handleResetSettings = async () => {
    if (!confirm('Are you sure you want to reset all settings to default values? This cannot be undone.')) {
      return;
    }

    try {
      setSettingsLoading(true);
      const resetData = await resetSettings();
      setSettings(resetData.settings);
      setTempSettings(resetData.settings);
      setHasChanges(false);
      toast.success('Settings reset to default values');
    } catch (err) {
      console.error('Error resetting settings:', err);
      toast.error('Failed to reset settings');
    } finally {
      setSettingsLoading(false);
    }
  };

  const handleUserSalaryUpdate = async (userId, baseSalary, dailyWage) => {
    try {
      await updateUserSalary(userId, { baseSalary, dailyWage });
      toast.success('User salary updated successfully');
      fetchData(); // Refresh attendance data
    } catch (err) {
      console.error('Error updating user salary:', err);
      toast.error('Failed to update user salary');
    }
  };

  const handleBulkSalaryUpdate = async () => {
    if (bulkSalaryUpdates.length === 0) {
      toast.error('No salary updates to apply');
      return;
    }

    try {
      const result = await bulkUpdateSalaries(bulkSalaryUpdates);
      toast.success(`Bulk update completed! ${result.successful} successful, ${result.failed} failed`);
      setBulkSalaryUpdates([]);
      fetchData(); // Refresh attendance data
    } catch (err) {
      console.error('Error with bulk salary update:', err);
      toast.error('Failed to perform bulk salary update');
    }
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatUptime = (seconds) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${days}d ${hours}h ${minutes}m`;
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      {/* Settings Navigation */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {[
              { id: 'salary', name: 'Salary Configuration', icon: DollarSign },
              { id: 'attendance', name: 'Attendance Settings', icon: Clock },
              { id: 'users', name: 'User Management', icon: Users },
              { id: 'system', name: 'System Settings', icon: Settings },
              { id: 'stats', name: 'System Statistics', icon: BarChart3 }
            ].map((tab) => {
              const IconComponent = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveSettingsTab(tab.id)}
                  className={`flex items-center py-4 px-1 border-b-2 font-medium text-sm ${
                    activeSettingsTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <IconComponent className="w-4 h-4 mr-2" />
                  {tab.name}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-6">
          {settingsLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-2 text-gray-600">Loading settings...</span>
            </div>
          ) : (
            <>
              {/* Salary Configuration */}
              {activeSettingsTab === 'salary' && tempSettings && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                      <DollarSign className="w-5 h-5 mr-2 text-green-600" />
                      Salary Configuration
                    </h3>
                    <div className="flex space-x-3">
                      <button
                        onClick={handleResetSettings}
                        className="btn-secondary flex items-center space-x-2"
                      >
                        <RotateCcw className="w-4 h-4" />
                        <span>Reset to Default</span>
                      </button>
                      <button
                        onClick={handleSaveSettings}
                        disabled={!hasChanges}
                        className="btn-primary flex items-center space-x-2 disabled:opacity-50"
                      >
                        <Save className="w-4 h-4" />
                        <span>Save Changes</span>
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <label className="label">Default Daily Wage (₹)</label>
                        <input
                          type="number"
                          value={tempSettings.defaultDailyWage}
                          onChange={(e) => handleSettingChange('defaultDailyWage', Number(e.target.value))}
                          className="input-field"
                          min="0"
                        />
                        <p className="text-xs text-gray-500 mt-1">Default daily wage for new employees</p>
                      </div>

                      <div>
                        <label className="label">Default Base Salary (₹)</label>
                        <input
                          type="number"
                          value={tempSettings.defaultBaseSalary}
                          onChange={(e) => handleSettingChange('defaultBaseSalary', Number(e.target.value))}
                          className="input-field"
                          min="0"
                        />
                        <p className="text-xs text-gray-500 mt-1">Default monthly base salary</p>
                      </div>

                      <div>
                        <label className="label">Maximum Working Days</label>
                        <input
                          type="number"
                          value={tempSettings.maxWorkingDays}
                          onChange={(e) => handleSettingChange('maxWorkingDays', Number(e.target.value))}
                          className="input-field"
                          min="1"
                          max="31"
                        />
                        <p className="text-xs text-gray-500 mt-1">Maximum payable days per month</p>
                      </div>

                      <div>
                        <label className="label">Salary Calculation Method</label>
                        <select
                          value={tempSettings.salaryCalculationMethod}
                          onChange={(e) => handleSettingChange('salaryCalculationMethod', e.target.value)}
                          className="input-field"
                        >
                          <option value="daily_wage">Daily Wage Based</option>
                          <option value="proportional">Proportional to Hours</option>
                          <option value="hybrid">Hybrid Method</option>
                        </select>
                        <p className="text-xs text-gray-500 mt-1">Primary method for salary calculation</p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="label">Attendance Bonus Threshold (%)</label>
                        <input
                          type="number"
                          value={tempSettings.attendanceBonusThreshold}
                          onChange={(e) => handleSettingChange('attendanceBonusThreshold', Number(e.target.value))}
                          className="input-field"
                          min="0"
                          max="100"
                        />
                        <p className="text-xs text-gray-500 mt-1">Minimum attendance % for bonus</p>
                      </div>

                      <div>
                        <label className="label">Attendance Bonus Amount (₹)</label>
                        <input
                          type="number"
                          value={tempSettings.attendanceBonusAmount}
                          onChange={(e) => handleSettingChange('attendanceBonusAmount', Number(e.target.value))}
                          className="input-field"
                          min="0"
                        />
                        <p className="text-xs text-gray-500 mt-1">Bonus amount for good attendance</p>
                      </div>

                      <div>
                        <label className="label">Late Deduction (%)</label>
                        <input
                          type="number"
                          step="0.1"
                          value={tempSettings.lateDeductionPercentage}
                          onChange={(e) => handleSettingChange('lateDeductionPercentage', Number(e.target.value))}
                          className="input-field"
                          min="0"
                          max="100"
                        />
                        <p className="text-xs text-gray-500 mt-1">Deduction percentage per late arrival</p>
                      </div>

                      <div>
                        <label className="label">Currency</label>
                        <select
                          value={tempSettings.currency}
                          onChange={(e) => handleSettingChange('currency', e.target.value)}
                          className="input-field"
                        >
                          <option value="INR">Indian Rupee (₹)</option>
                          <option value="USD">US Dollar ($)</option>
                          <option value="EUR">Euro (€)</option>
                          <option value="GBP">British Pound (£)</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Attendance Settings */}
              {activeSettingsTab === 'attendance' && tempSettings && (
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                    <Clock className="w-5 h-5 mr-2 text-blue-600" />
                    Attendance Configuration
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <label className="label">Standard Working Hours</label>
                        <input
                          type="number"
                          value={tempSettings.standardWorkingHours}
                          onChange={(e) => handleSettingChange('standardWorkingHours', Number(e.target.value))}
                          className="input-field"
                          min="1"
                          max="24"
                        />
                        <p className="text-xs text-gray-500 mt-1">Standard hours per working day</p>
                      </div>

                      <div>
                        <label className="label">Late Arrival Threshold (minutes)</label>
                        <input
                          type="number"
                          value={tempSettings.lateArrivalThreshold}
                          onChange={(e) => handleSettingChange('lateArrivalThreshold', Number(e.target.value))}
                          className="input-field"
                          min="0"
                        />
                        <p className="text-xs text-gray-500 mt-1">Minutes after which arrival is considered late</p>
                      </div>

                      <div>
                        <label className="label">Minimum Working Hours</label>
                        <input
                          type="number"
                          value={tempSettings.minimumWorkingHours}
                          onChange={(e) => handleSettingChange('minimumWorkingHours', Number(e.target.value))}
                          className="input-field"
                          min="1"
                          max="12"
                        />
                        <p className="text-xs text-gray-500 mt-1">Minimum hours to count as present</p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="label">Overtime Multiplier</label>
                        <input
                          type="number"
                          step="0.1"
                          value={tempSettings.overtimeMultiplier}
                          onChange={(e) => handleSettingChange('overtimeMultiplier', Number(e.target.value))}
                          className="input-field"
                          min="1"
                        />
                        <p className="text-xs text-gray-500 mt-1">Multiplier for overtime hours</p>
                      </div>

                      <div>
                        <label className="label">Casual Leave Per Month</label>
                        <input
                          type="number"
                          value={tempSettings.casualLeavePerMonth}
                          onChange={(e) => handleSettingChange('casualLeavePerMonth', Number(e.target.value))}
                          className="input-field"
                          min="0"
                        />
                      </div>

                      <div>
                        <label className="label">Sick Leave Per Month</label>
                        <input
                          type="number"
                          value={tempSettings.sickLeavePerMonth}
                          onChange={(e) => handleSettingChange('sickLeavePerMonth', Number(e.target.value))}
                          className="input-field"
                          min="0"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* User Management */}
              {activeSettingsTab === 'users' && (
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                    <Users className="w-5 h-5 mr-2 text-purple-600" />
                    User Salary Management
                  </h3>

                  {/* Individual User Salary Updates */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-4">Individual User Salary Settings</h4>
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {attendanceData.map((user) => (
                        <div key={user._id} className="flex items-center justify-between bg-white rounded-lg p-3 border">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                              <span className="text-xs font-medium text-gray-700">
                                {user.name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{user.name}</p>
                              <p className="text-xs text-gray-500">{user.employeeId}</p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-3">
                            <div className="text-right">
                              <p className="text-sm font-medium">₹{user.baseSalary || 8000}</p>
                              <p className="text-xs text-gray-500">Base Salary</p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-medium">₹{user.dailyWage || 258}</p>
                              <p className="text-xs text-gray-500">Daily Wage</p>
                            </div>
                            <button
                              onClick={() => {
                                const newBaseSalary = prompt('Enter new base salary:', user.baseSalary || 8000);
                                const newDailyWage = prompt('Enter new daily wage:', user.dailyWage || 258);
                                if (newBaseSalary && newDailyWage) {
                                  handleUserSalaryUpdate(user.userId, Number(newBaseSalary), Number(newDailyWage));
                                }
                              }}
                              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                            >
                              Edit
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Bulk Salary Update */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-medium text-blue-900 mb-2 flex items-center">
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Bulk Salary Update
                    </h4>
                    <p className="text-sm text-blue-700 mb-4">
                      Apply percentage increase/decrease to all employee salaries
                    </p>
                    <div className="flex items-center space-x-3">
                      <input
                        type="number"
                        placeholder="Percentage change (e.g., 10 for 10% increase)"
                        className="flex-1 px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            const percentage = Number(e.target.value);
                            if (percentage !== 0) {
                              const updates = attendanceData.map(user => ({
                                userId: user.userId,
                                baseSalary: Math.round((user.baseSalary || 8000) * (1 + percentage / 100)),
                                dailyWage: Math.round((user.dailyWage || 258) * (1 + percentage / 100))
                              }));
                              setBulkSalaryUpdates(updates);
                              e.target.value = '';
                            }
                          }
                        }}
                      />
                      <button
                        onClick={handleBulkSalaryUpdate}
                        disabled={bulkSalaryUpdates.length === 0}
                        className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg"
                      >
                        Apply Bulk Update
                      </button>
                    </div>
                    {bulkSalaryUpdates.length > 0 && (
                      <p className="text-sm text-blue-600 mt-2">
                        Ready to update {bulkSalaryUpdates.length} employee salaries
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* System Settings */}
              {activeSettingsTab === 'system' && tempSettings && (
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                    <Settings className="w-5 h-5 mr-2 text-gray-600" />
                    System Configuration
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <label className="label">Company Name</label>
                        <input
                          type="text"
                          value={tempSettings.companyName}
                          onChange={(e) => handleSettingChange('companyName', e.target.value)}
                          className="input-field"
                        />
                      </div>

                      <div>
                        <label className="label">Company Email</label>
                        <input
                          type="email"
                          value={tempSettings.companyEmail}
                          onChange={(e) => handleSettingChange('companyEmail', e.target.value)}
                          className="input-field"
                        />
                      </div>

                      <div>
                        <label className="label">Financial Year Start</label>
                        <select
                          value={tempSettings.financialYearStart}
                          onChange={(e) => handleSettingChange('financialYearStart', e.target.value)}
                          className="input-field"
                        >
                          <option value="January">January</option>
                          <option value="April">April</option>
                          <option value="July">July</option>
                          <option value="October">October</option>
                        </select>
                      </div>

                      <div>
                        <label className="label">Session Timeout (minutes)</label>
                        <input
                          type="number"
                          value={tempSettings.sessionTimeout}
                          onChange={(e) => handleSettingChange('sessionTimeout', Number(e.target.value))}
                          className="input-field"
                          min="30"
                        />
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="label">Auto Expose After Days</label>
                        <input
                          type="number"
                          value={tempSettings.autoExposeAfterDays}
                          onChange={(e) => handleSettingChange('autoExposeAfterDays', Number(e.target.value))}
                          className="input-field"
                          min="0"
                        />
                        <p className="text-xs text-gray-500 mt-1">Automatically expose salary data after X days</p>
                      </div>

                      <div>
                        <label className="label">Default Report Format</label>
                        <select
                          value={tempSettings.defaultReportFormat}
                          onChange={(e) => handleSettingChange('defaultReportFormat', e.target.value)}
                          className="input-field"
                        >
                          <option value="csv">CSV</option>
                          <option value="excel">Excel</option>
                          <option value="pdf">PDF</option>
                        </select>
                      </div>

                      <div className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          id="emailNotifications"
                          checked={tempSettings.enableEmailNotifications}
                          onChange={(e) => handleSettingChange('enableEmailNotifications', e.target.checked)}
                          className="rounded border-gray-300"
                        />
                        <label htmlFor="emailNotifications" className="text-sm font-medium text-gray-700">
                          Enable Email Notifications
                        </label>
                      </div>

                      <div className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          id="autoBackup"
                          checked={tempSettings.autoBackupEnabled}
                          onChange={(e) => handleSettingChange('autoBackupEnabled', e.target.checked)}
                          className="rounded border-gray-300"
                        />
                        <label htmlFor="autoBackup" className="text-sm font-medium text-gray-700">
                          Enable Auto Backup
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* System Statistics */}
              {activeSettingsTab === 'stats' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                      <BarChart3 className="w-5 h-5 mr-2 text-indigo-600" />
                      System Statistics
                    </h3>
                    <button
                      onClick={fetchSystemStats}
                      className="btn-secondary flex items-center space-x-2"
                    >
                      <RefreshCw className="w-4 h-4" />
                      <span>Refresh</span>
                    </button>
                  </div>

                  {systemStats ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {/* User Statistics */}
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-medium text-blue-900">User Statistics</h4>
                          <Users className="w-5 h-5 text-blue-600" />
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-sm text-blue-700">Total Users:</span>
                            <span className="font-medium text-blue-900">{systemStats.users?.total || 0}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-blue-700">Active Users:</span>
                            <span className="font-medium text-blue-900">{systemStats.users?.active || 0}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-blue-700">Admins:</span>
                            <span className="font-medium text-blue-900">{systemStats.users?.admins || 0}</span>
                          </div>
                        </div>
                      </div>

                      {/* Database Statistics */}
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-medium text-green-900">Database</h4>
                          <Database className="w-5 h-5 text-green-600" />
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-sm text-green-700">Total Size:</span>
                            <span className="font-medium text-green-900">
                              {systemStats.database?.sizeFormatted || '0 Bytes'}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-green-700">Documents:</span>
                            <span className="font-medium text-green-900">{systemStats.database?.totalDocuments || 0}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-green-700">Collections:</span>
                            <span className="font-medium text-green-900">{systemStats.database?.collections?.length || 0}</span>
                          </div>
                        </div>
                      </div>

                      {/* System Information */}
                      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-medium text-purple-900">System Info</h4>
                          <Cpu className="w-5 h-5 text-purple-600" />
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-sm text-purple-700">Node Version:</span>
                            <span className="font-medium text-purple-900">{systemStats.system?.nodeVersion || 'N/A'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-purple-700">Uptime:</span>
                            <span className="font-medium text-purple-900">
                              {systemStats.system?.uptime ? formatUptime(systemStats.system.uptime) : 'N/A'}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-purple-700">Platform:</span>
                            <span className="font-medium text-purple-900">{systemStats.system?.platform || 'N/A'}</span>
                          </div>
                        </div>
                      </div>

                      {/* Memory Usage */}
                      {systemStats.system?.memoryUsage && (
                        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="font-medium text-orange-900">Memory Usage</h4>
                            <HardDrive className="w-5 h-5 text-orange-600" />
                          </div>
                          <div className="space-y-2">
                            <div className="flex justify-between">
                              <span className="text-sm text-orange-700">RSS:</span>
                              <span className="font-medium text-orange-900">
                                {formatBytes(systemStats.system.memoryUsage.rss)}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm text-orange-700">Heap Used:</span>
                              <span className="font-medium text-orange-900">
                                {formatBytes(systemStats.system.memoryUsage.heapUsed)}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm text-orange-700">Heap Total:</span>
                              <span className="font-medium text-orange-900">
                                {formatBytes(systemStats.system.memoryUsage.heapTotal)}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Database Collections */}
                      {systemStats.database?.collections && (
                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 md:col-span-2">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="font-medium text-gray-900">Database Collections</h4>
                            <Database className="w-5 h-5 text-gray-600" />
                          </div>
                          <div className="space-y-2">
                            {systemStats.database.collections.map((collection, index) => (
                              <div key={index} className="flex justify-between items-center">
                                <span className="text-sm text-gray-700 capitalize">{collection.name}</span>
                                <div className="flex space-x-4">
                                  <span className="text-xs text-gray-500">{collection.documents} docs</span>
                                  <span className="text-xs text-gray-500">{formatBytes(collection.size)}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
                      <p className="mt-2 text-gray-600">Loading system statistics...</p>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Save Changes Banner */}
      {hasChanges && (
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed bottom-4 right-4 bg-blue-600 text-white px-6 py-3 rounded-lg shadow-lg flex items-center space-x-3"
        >
          <AlertTriangle className="w-5 h-5" />
          <span>You have unsaved changes</span>
          <button
            onClick={handleSaveSettings}
            className="bg-blue-700 hover:bg-blue-800 px-3 py-1 rounded text-sm"
          >
            Save Now
          </button>
        </motion.div>
      )}
    </motion.div>
  );
}

export default SettingsTab;