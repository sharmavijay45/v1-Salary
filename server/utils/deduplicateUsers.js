import Attendance from '../models/Attendance.js';

/**
 * Remove duplicate users with the same name, keeping the one with better data
 */
export const deduplicateAttendanceRecords = async () => {
  try {
    console.log('Starting deduplication of attendance records...');
    
    // Get all attendance records
    const allRecords = await Attendance.find({}).sort({ name: 1, hoursWorked: -1 });
    
    if (allRecords.length === 0) {
      console.log('No attendance records found.');
      return { removed: 0, kept: 0 };
    }
    
    const uniqueUsers = new Map();
    const duplicatesToRemove = [];
    
    // Group by name and find duplicates
    allRecords.forEach(record => {
      const nameKey = record.name.toLowerCase().trim();
      
      if (!uniqueUsers.has(nameKey)) {
        // First occurrence of this name
        uniqueUsers.set(nameKey, record);
      } else {
        // Duplicate found
        const existing = uniqueUsers.get(nameKey);
        
        // Determine which record to keep (better data wins)
        const currentScore = calculateRecordScore(record);
        const existingScore = calculateRecordScore(existing);
        
        if (currentScore > existingScore) {
          // Current record is better, mark existing for removal
          duplicatesToRemove.push(existing._id);
          uniqueUsers.set(nameKey, record);
        } else {
          // Existing record is better, mark current for removal
          duplicatesToRemove.push(record._id);
        }
      }
    });
    
    // Remove duplicate records
    if (duplicatesToRemove.length > 0) {
      await Attendance.deleteMany({ _id: { $in: duplicatesToRemove } });
      console.log(`Removed ${duplicatesToRemove.length} duplicate records`);
    }
    
    const keptCount = uniqueUsers.size;
    console.log(`Kept ${keptCount} unique user records`);
    
    return {
      removed: duplicatesToRemove.length,
      kept: keptCount,
      totalProcessed: allRecords.length
    };
    
  } catch (error) {
    console.error('Error during deduplication:', error);
    throw error;
  }
};

/**
 * Calculate a score for a record to determine which duplicate to keep
 * Higher score = better record
 */
const calculateRecordScore = (record) => {
  let score = 0;
  
  // More hours worked = better
  score += record.hoursWorked * 10;
  
  // More days present = better
  score += record.daysPresent * 5;
  
  // More attendance details = better
  score += (record.attendanceDetails?.length || 0) * 2;
  
  // Has employee ID = better
  if (record.employeeId && record.employeeId.trim()) {
    score += 50;
  }
  
  // Has department = better
  if (record.dept && record.dept.trim() && record.dept !== 'General') {
    score += 20;
  }
  
  // More recent update = slightly better
  if (record.updatedAt) {
    score += Math.floor((new Date(record.updatedAt).getTime() - new Date('2025-01-01').getTime()) / (1000 * 60 * 60 * 24));
  }
  
  return score;
};

/**
 * Get duplicate users summary without removing them
 */
export const getDuplicateUsersSummary = async () => {
  try {
    const allRecords = await Attendance.find({}).sort({ name: 1 });
    const nameGroups = new Map();
    
    // Group by name
    allRecords.forEach(record => {
      const nameKey = record.name.toLowerCase().trim();
      if (!nameGroups.has(nameKey)) {
        nameGroups.set(nameKey, []);
      }
      nameGroups.get(nameKey).push(record);
    });
    
    // Find duplicates
    const duplicates = [];
    nameGroups.forEach((records, name) => {
      if (records.length > 1) {
        duplicates.push({
          name: records[0].name, // Original case
          count: records.length,
          records: records.map(r => ({
            id: r._id,
            employeeId: r.employeeId,
            dept: r.dept,
            hoursWorked: r.hoursWorked,
            daysPresent: r.daysPresent,
            monthYear: r.monthYear
          }))
        });
      }
    });
    
    return {
      totalRecords: allRecords.length,
      uniqueNames: nameGroups.size,
      duplicateGroups: duplicates.length,
      duplicates
    };
    
  } catch (error) {
    console.error('Error getting duplicates summary:', error);
    throw error;
  }
};
