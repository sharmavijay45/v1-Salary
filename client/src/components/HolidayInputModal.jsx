import { useState } from 'react';

const HolidayInputModal = ({ isOpen, onClose, onSubmit }) => {
  const [holidays, setHolidays] = useState(0);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());

  if (!isOpen) {
    return null;
  }

  const handleSubmit = () => {
    onSubmit(holidays, `${year}-${String(month).padStart(2, '0')}`);
    onClose();
  };

  const months = [
    { value: 1, name: 'January' },
    { value: 2, name: 'February' },
    { value: 3, name: 'March' },
    { value: 4, name: 'April' },
    { value: 5, name: 'May' },
    { value: 6, name: 'June' },
    { value: 7, name: 'July' },
    { value: 8, name: 'August' },
    { value: 9, name: 'September' },
    { value: 10, name: 'October' },
    { value: 11, name: 'November' },
    { value: 12, name: 'December' },
  ];

  const years = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
      <div className="bg-white p-6 rounded-lg">
        <h2 className="text-lg font-bold mb-4">Enter Attendance Details</h2>
        <div className="mb-4">
          <label className="block mb-2">Month</label>
          <select value={month} onChange={(e) => setMonth(parseInt(e.target.value, 10))} className="w-full p-2 border rounded">
            {months.map(m => <option key={m.value} value={m.value}>{m.name}</option>)}
          </select>
        </div>
        <div className="mb-4">
          <label className="block mb-2">Year</label>
          <select value={year} onChange={(e) => setYear(parseInt(e.target.value, 10))} className="w-full p-2 border rounded">
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <div className="mb-4">
          <label className="block mb-2">Number of Holidays</label>
          <input
            type="number"
            value={holidays}
            onChange={(e) => setHolidays(parseInt(e.target.value, 10))}
            className="w-full p-2 border rounded"
          />
        </div>
        <div className="flex justify-end">
          <button onClick={onClose} className="mr-2 px-4 py-2 rounded">Cancel</button>
          <button onClick={handleSubmit} className="bg-blue-500 text-white px-4 py-2 rounded">Submit</button>
        </div>
      </div>
    </div>
  );
};

export default HolidayInputModal;
