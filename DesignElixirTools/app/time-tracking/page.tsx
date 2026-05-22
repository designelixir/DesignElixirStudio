'use client';

import { useState } from 'react';
import TimeTrackedList from './TimeTrackedList';
import AddTimeCSV from '../projects/AddTimeCSV';

export default function TimeTrackingPage() {
  const [refreshKey, setRefreshKey] = useState(0);

  const handleEntrySaved = () => {
    setRefreshKey(prev => prev + 1);
  };

  return (
    <div className='flex-start-start full-width flex-column basic-padding'>
      <div className="flex-center-spacebetween full-width" style={{marginBottom: '25px'}}>
        <h1>Time Tracking</h1>
      </div>
      
      

      {/* <AddTimeCSV /> */}
      <TimeTrackedList/>
    </div>
  );
}