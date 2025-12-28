import React from 'react';
import { InputMode, AppView } from '../types';

interface BottomBarProps {
  activeMode: InputMode;
  onModeSwitch: (mode: InputMode) => void;
  activeAppView: AppView;
  onAppViewSwitch: (view: AppView) => void;
}

const BottomBar: React.FC<BottomBarProps> = ({ 
  activeMode, 
  onModeSwitch, 
  activeAppView, 
  onAppViewSwitch 
}) => {
  const handleInputToggle = (mode: InputMode) => {
    if (activeMode === mode) {
      // If clicking the same input button, just close input
      onModeSwitch('none');
    } else {
      // If switching to an input mode, ensure we are on home view
      onAppViewSwitch('active');
      onModeSwitch(mode);
    }
  };

  const handleViewToggle = (view: AppView) => {
    if (activeAppView === view) {
      // If clicking the already active view button, return to home
      onAppViewSwitch('active');
    } else {
      // Switch to the target view and close any open inputs
      onAppViewSwitch(view);
      onModeSwitch('none');
    }
  };

  const navItems = [
    { 
      id: 'voice', 
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
        </svg>
      ), 
      action: () => handleInputToggle('voice'), 
      isActive: activeMode === 'voice',
      activeColor: 'text-[#34749D]', 
      inactiveColor: 'text-[#648CA6]' 
    },
    { 
      id: 'text', 
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
        </svg>
      ), 
      action: () => handleInputToggle('text'), 
      isActive: activeMode === 'text',
      activeColor: 'text-[#B05B2D]', 
      inactiveColor: 'text-[#C38B6E]' 
    },
    { 
      id: 'calendar', 
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ), 
      action: () => handleViewToggle('calendar'), 
      isActive: activeAppView === 'calendar',
      activeColor: 'text-[#4D886D]', 
      inactiveColor: 'text-[#779C8A]' 
    },
    { 
      id: 'archived', 
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ), 
      action: () => handleViewToggle('archived'), 
      isActive: activeAppView === 'archived',
      activeColor: 'text-[#7B5FA0]', 
      inactiveColor: 'text-[#9683AF]' 
    }
  ];

  return (
    <nav className="fixed bottom-3 inset-x-0 h-18 flex items-center justify-center px-5 z-[100]">
      <div className="nm-raised rounded-[24px] px-5 py-2 flex items-center justify-between w-full max-w-sm">
        {navItems.map((item) => (
          <button 
            key={item.id}
            onClick={item.action}
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 nm-button ${
              item.isActive 
                ? `nm-inset ${item.activeColor}` 
                : `${item.inactiveColor}`
            }`}
          >
            {item.icon}
          </button>
        ))}
      </div>
    </nav>
  );
};

export default BottomBar;