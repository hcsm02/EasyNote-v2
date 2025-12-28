import React from 'react';

interface RevertButtonProps {
  onClick: () => void;
}

const RevertButton: React.FC<RevertButtonProps> = ({ onClick }) => {
  return (
    <button 
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className="w-14 h-14 nm-raised rounded-full flex items-center justify-center text-teal-600 hover:scale-110 active:nm-inset transition-all"
      aria-label="Revert selected tasks to pending"
    >
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
      </svg>
    </button>
  );
};

export default RevertButton;