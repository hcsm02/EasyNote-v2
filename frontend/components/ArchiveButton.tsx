
import React from 'react';

interface ArchiveButtonProps {
  onClick: () => void;
}

const ArchiveButton: React.FC<ArchiveButtonProps> = ({ onClick }) => {
  return (
    <button 
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className="w-14 h-14 nm-raised rounded-full flex items-center justify-center text-indigo-500 hover:scale-110 active:nm-inset transition-all"
      aria-label="Archive selected tasks"
    >
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
      </svg>
    </button>
  );
};

export default ArchiveButton;
