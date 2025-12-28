
import React from 'react';
import { TimeView } from '../types';

interface TimeSwitcherProps {
  active: TimeView;
  onSwitch: (view: TimeView) => void;
}

const TimeSwitcher: React.FC<TimeSwitcherProps> = ({ active, onSwitch }) => {
  const options = [
    { label: '历史', value: TimeView.HISTORY },
    { label: '今天', value: TimeView.TODAY },
    { label: '未来2天', value: TimeView.FUTURE2 },
    { label: '更远', value: TimeView.LATER },
  ];

  return (
    <div className="nm-inset p-1 rounded-2xl flex items-center justify-between gap-1">
      {options.map((option) => (
        <button
          key={option.value}
          onClick={() => onSwitch(option.value)}
          className={`flex-1 py-2 rounded-xl text-[10px] font-bold tracking-tight transition-all duration-300 ${
            active === option.value 
              ? 'nm-raised-sm text-indigo-500' 
              : 'text-gray-400 hover:text-gray-500'
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
};

export default TimeSwitcher;
