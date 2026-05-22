'use client'
import React, { useState } from 'react';

interface TabsProps {
  tabs: {
    name: string;
    content: React.ReactNode;
  }[];
}

export default function Tabs({ tabs }: TabsProps) {
  const [activeTab, setActiveTab] = useState(0);

  return (
    <div className="tabs-container">
      <div className="tabs-header">
        {tabs.map((tab, index) => (
          <button
            key={index}
            className={`tab-button ${activeTab === index ? 'tab-button-active' : ''}`}
            onClick={() => setActiveTab(index)}
          >
            {tab.name}
          </button>
        ))}
      </div>
      <div className="tabs-content">
        {tabs[activeTab].content}
      </div>
    </div>
  );
}