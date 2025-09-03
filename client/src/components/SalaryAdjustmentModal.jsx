import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Minus, DollarSign, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

function SalaryAdjustmentModal({ 
  isOpen, 
  onClose, 
  user, 
  onIncrease, 
  onDecrease, 
  onManualAdjust,
  loading 
}) {
  const [adjustmentType, setAdjustmentType] = useState('increase');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [manualSalary, setManualSalary] = useState('');

  const handleSubmit = async () => {
    if (!amount && adjustmentType !== 'manual') {
      toast.error('Please enter an amount');
      return;
    }
    if (!manualSalary && adjustmentType === 'manual') {
      toast.error('Please enter the new salary amount');
      return;
    }
    if (!reason.trim()) {
      toast.error('Please provide a reason for the adjustment');
      return;
    }

    try {
      if (adjustmentType === 'increase') {
        await onIncrease(parseFloat(amount), reason);
      } else if (adjustmentType === 'decrease') {
        await onDecrease(parseFloat(amount), reason);
      } else {
        await onManualAdjust(parseFloat(manualSalary), reason);
      }
      
      // Reset form
      setAmount('');
      setReason('');
      setManualSalary('');
      onClose();
    } catch (error) {
      console.error('Adjustment error:', error);
      toast.error('Error applying adjustment. Please try again.');
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-white rounded-xl shadow-2xl max-w-md w-full my-8 max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-4 rounded-t-xl">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold flex items-center">
                <DollarSign className="w-5 h-5 mr-2" />
                Adjust Salary
              </h2>
              <button
                onClick={onClose}
                className="text-white hover:text-gray-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* User Info */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-2">{user?.name}</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Current Salary:</span>
                  <span className="font-medium text-gray-900 ml-2">₹{user?.adjustedSalary?.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-gray-600">Base Salary:</span>
                  <span className="font-medium text-gray-900 ml-2">₹{user?.baseSalary?.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Adjustment Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">Adjustment Type</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => setAdjustmentType('increase')}
                  className={`flex items-center justify-center px-3 py-2 rounded-lg border transition-colors ${
                    adjustmentType === 'increase'
                      ? 'bg-green-100 border-green-500 text-green-700'
                      : 'bg-gray-50 border-gray-300 text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Increase
                </button>
                <button
                  onClick={() => setAdjustmentType('decrease')}
                  className={`flex items-center justify-center px-3 py-2 rounded-lg border transition-colors ${
                    adjustmentType === 'decrease'
                      ? 'bg-red-100 border-red-500 text-red-700'
                      : 'bg-gray-50 border-gray-300 text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Minus className="w-4 h-4 mr-1" />
                  Decrease
                </button>
                <button
                  onClick={() => setAdjustmentType('manual')}
                  className={`flex items-center justify-center px-3 py-2 rounded-lg border transition-colors ${
                    adjustmentType === 'manual'
                      ? 'bg-blue-100 border-blue-500 text-blue-700'
                      : 'bg-gray-50 border-gray-300 text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <DollarSign className="w-4 h-4 mr-1" />
                  Manual
                </button>
              </div>
            </div>

            {/* Amount Input */}
            {adjustmentType !== 'manual' ? (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {adjustmentType === 'increase' ? 'Increase Amount' : 'Decrease Amount'} (₹)
                </label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter amount"
                  min="0"
                  step="1"
                />
                {amount && (
                  <div className="mt-2 p-2 bg-blue-50 rounded text-sm">
                    <span className="text-blue-700">
                      New Salary: ₹{(
                        adjustmentType === 'increase' 
                          ? (user?.adjustedSalary || 0) + parseFloat(amount || 0)
                          : Math.max(0, (user?.adjustedSalary || 0) - parseFloat(amount || 0))
                      ).toLocaleString()}
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  New Salary Amount (₹)
                </label>
                <input
                  type="number"
                  value={manualSalary}
                  onChange={(e) => setManualSalary(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter new salary"
                  min="0"
                  step="1"
                />
                {manualSalary && (
                  <div className="mt-2 p-2 bg-blue-50 rounded text-sm">
                    <span className="text-blue-700">
                      Change: {parseFloat(manualSalary || 0) > (user?.adjustedSalary || 0) ? '+' : ''}
                      ₹{(parseFloat(manualSalary || 0) - (user?.adjustedSalary || 0)).toLocaleString()}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Reason */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reason for Adjustment <span className="text-red-500">*</span>
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={3}
                placeholder="Explain the reason for this salary adjustment..."
              />
            </div>

            {/* Warning */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <div className="flex items-start">
                <AlertCircle className="w-5 h-5 text-yellow-600 mr-2 mt-0.5" />
                <div className="text-sm text-yellow-800">
                  <p className="font-medium">Important:</p>
                  <p>This adjustment will be recorded and visible to the employee. Make sure the reason is clear and professional.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-200 px-6 py-4 flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading || (!amount && !manualSalary) || !reason.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Processing...
                </>
              ) : (
                <>
                  {adjustmentType === 'increase' && <Plus className="w-4 h-4 mr-2" />}
                  {adjustmentType === 'decrease' && <Minus className="w-4 h-4 mr-2" />}
                  {adjustmentType === 'manual' && <DollarSign className="w-4 h-4 mr-2" />}
                  Apply Adjustment
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

export default SalaryAdjustmentModal;