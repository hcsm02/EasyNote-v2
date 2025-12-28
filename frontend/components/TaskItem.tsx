
import React from 'react';
import { Task } from '../types';

interface TaskItemProps {
  task: Task;
  onToggle: () => void;
  onEdit: () => void;
}

const TaskItem: React.FC<TaskItemProps> = ({ task, onToggle, onEdit }) => {
  // Simple check for today's date vs task dueDate
  const today = new Date().toISOString().split('T')[0];
  const isToday = task.dueDate === today;

  return (
    <div 
      className={`nm-inset rounded-2xl p-4 flex items-center transition-all duration-300 cursor-pointer active:nm-inset-sm group`}
      onClick={onEdit}
    >
      {/* Convex Checkbox */}
      <div 
        className="mr-4 flex-shrink-0"
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
      >
        <div className={`w-7 h-7 rounded-xl transition-all duration-200 flex items-center justify-center ${
          task.selected 
            ? 'nm-inset-sm bg-white/40' 
            : 'nm-raised-sm'
        }`}>
          <svg 
            className={`w-4 h-4 transition-colors duration-300 ${
              task.selected ? 'text-green-500' : 'text-gray-300'
            }`} 
            fill="currentColor" 
            viewBox="0 0 20 20"
          >
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        </div>
      </div>

      {/* Task Text & Date */}
      <div className="flex-grow flex flex-col min-w-0">
        <span className={`text-sm font-semibold transition-all duration-300 leading-tight tracking-tight truncate ${
          task.selected ? 'text-gray-400' : 'text-gray-600'
        }`}>
          {task.text}
        </span>
        {!isToday && task.dueDate && (
          <span className="text-[8px] font-bold text-gray-300 uppercase tracking-widest mt-0.5">
            {task.dueDate.split('-').slice(1).join('/')}
          </span>
        )}
      </div>

      {/* Detail Arrow */}
      <div className="ml-2 text-gray-200 group-hover:text-gray-300 transition-colors">
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </div>
  );
};

export default TaskItem;
