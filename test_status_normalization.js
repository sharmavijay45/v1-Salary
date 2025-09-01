// Test script to verify status normalization
const testStatusNormalization = () => {
  const testStatuses = ['PRESENT', 'P', 'WFH', 'EWFH', 'HALF DAY', 'HD', 'A', 'ABSENT', '-', 'AB'];

  console.log('Testing status normalization:');
  testStatuses.forEach(status => {
    const cleanStatus = status?.toUpperCase().trim();

    // Normalize status to match Mongoose enum values
    let normalizedStatus = 'Absent'; // Default
    if (['PRESENT', 'P', 'WFH', 'EWFH'].includes(cleanStatus)) {
      normalizedStatus = 'Present';
    } else if (['HALF DAY', 'HD'].includes(cleanStatus)) {
      normalizedStatus = 'Half Day';
    } else if (['A', 'ABSENT', 'AB'].includes(cleanStatus)) {
      normalizedStatus = 'Absent';
    } else if (cleanStatus === '-') {
      normalizedStatus = 'Absent'; // No entry = Absent
    }

    console.log(`"${status}" -> "${normalizedStatus}"`);
  });
};

testStatusNormalization();