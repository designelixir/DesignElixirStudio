'use client';

import TimeTrackerBar from '../time-tracking/TimeTrackerBar';
import { useTimeEntries } from '../context/TimeEntriesContext';

export default function TimeTrackerWrapper() {
  const { triggerRefresh } = useTimeEntries();

  return <TimeTrackerBar onEntrySaved={triggerRefresh} />;
}