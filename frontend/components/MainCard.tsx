import React from 'react';
import { Task } from '../types';
import TaskItem from './TaskItem';

interface MainCardProps {
  tasks: Task[];
  onToggle: (id: string) => void;
  onEdit: (id: string) => void;
  title?: string;
  switcher?: React.ReactNode;
}

const MainCard: React.FC<MainCardProps> = ({ tasks, onToggle, onEdit, title, switcher }) => {
  return (
    <div className="nm-raised rounded-[32px] p-5 flex-1 flex flex-col overflow-hidden transition-all duration-500">
      {/* Header section */}
      <div className="flex items-center mb-5 flex-shrink-0">
        {switcher ? (
          <div className="flex-grow mr-4">
            {switcher}
          </div>
        ) : (
          <h2 className="flex-grow text-xs font-bold text-gray-400 tracking-widest uppercase px-1">{title}</h2>
        )}
        <div className="text-[10px] font-bold text-gray-500 nm-inset rounded-xl w-8 h-8 flex items-center justify-center flex-shrink-0">
          {tasks.length}
        </div>
      </div>
      
      {/* Task list container */}
      <div className="flex flex-col space-y-4 flex-1 overflow-y-auto pr-0.5 no-scrollbar pb-2">
        {tasks.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-300 font-light">
            <div className="w-1 h-1 bg-gray-200 rounded-full mb-2"></div>
            <p className="text-[10px] font-bold tracking-widest uppercase">Finished</p>
          </div>
        ) : (
          tasks.map((task) => (
            <TaskItem 
              key={task.id} 
              task={task} 
              onToggle={() => onToggle(task.id)} 
              onEdit={() => onEdit(task.id)}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default MainCard;
