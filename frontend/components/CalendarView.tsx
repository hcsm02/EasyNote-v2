
import React, { useState, useMemo } from 'react';
import { Task, TimeView } from '../types';
import TaskItem from './TaskItem';
import ArchiveButton from './ArchiveButton';
import RevertButton from './RevertButton';
import DeleteButton from './DeleteButton';

interface CalendarViewProps {
  tasks: Task[];
  onToggle: (id: string) => void;
  onEdit: (id: string) => void;
  onAddTask: (text: string, date: string) => void;
  onArchive: () => void;    // 归档选中任务
  onRevert: () => void;     // 反归档选中任务
  onDelete: () => void;     // 删除选中任务
}

const CalendarView: React.FC<CalendarViewProps> = ({
  tasks,
  onToggle,
  onEdit,
  onAddTask,
  onArchive,
  onRevert,
  onDelete
}) => {
  const [viewDate, setViewDate] = useState(new Date());
  const [selectedDayISO, setSelectedDayISO] = useState<string | null>(null);
  const [quickInput, setQuickInput] = useState('');

  const month = viewDate.getMonth();
  const year = viewDate.getFullYear();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay();

  const prevMonth = () => setViewDate(new Date(year, month - 1, 1));
  const nextMonth = () => setViewDate(new Date(year, month + 1, 1));

  const monthName = viewDate.toLocaleString('en-US', { month: 'long' });

  // Group tasks by date for efficient lookup
  const tasksByDate = useMemo(() => {
    const map: Record<string, Task[]> = {};
    tasks.forEach(task => {
      if (!map[task.dueDate]) map[task.dueDate] = [];
      map[task.dueDate].push(task);
    });
    return map;
  }, [tasks]);

  const handleQuickAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (quickInput.trim() && selectedDayISO) {
      onAddTask(quickInput.trim(), selectedDayISO);
      setQuickInput('');
    }
  };

  const renderDays = () => {
    const days = [];
    // Padding for first week
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(<div key={`pad-${i}`} className="h-12 w-full" />);
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dayTasks = tasksByDate[dateStr] || [];
      const archivedCount = dayTasks.filter(t => t.archived).length;
      const pendingCount = dayTasks.filter(t => !t.archived).length;

      const isToday = new Date().toISOString().split('T')[0] === dateStr;

      days.push(
        <button
          key={d}
          onClick={() => setSelectedDayISO(dateStr)}
          className={`h-14 w-full flex flex-col items-center justify-center rounded-2xl relative transition-all duration-300 ${isToday ? 'nm-inset-sm text-indigo-500' : 'hover:nm-raised-sm text-gray-600'
            }`}
        >
          <span className="text-xs font-bold">{d}</span>
          <div className="flex gap-0.5 mt-1 h-1">
            {archivedCount > 0 && <div className="w-1 h-1 rounded-full bg-green-400" />}
            {pendingCount > 0 && pendingCount <= 3 && <div className="w-1 h-1 rounded-full bg-orange-400" />}
            {pendingCount > 3 && <div className="w-1 h-1 rounded-full bg-red-400" />}
          </div>
        </button>
      );
    }
    return days;
  };

  const selectedDayTasks = selectedDayISO ? (tasksByDate[selectedDayISO] || []) : [];

  if (selectedDayISO) {
    return (
      <div className="nm-raised rounded-[32px] p-5 flex-1 flex flex-col overflow-hidden animate-in slide-in-from-right duration-300 relative">
        <div className="flex items-center mb-6">
          <button
            onClick={() => setSelectedDayISO(null)}
            className="w-10 h-10 nm-raised rounded-full flex items-center justify-center text-gray-400 mr-4 active:nm-inset"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="flex-grow">
            <h2 className="text-xs font-bold text-gray-400 tracking-widest uppercase">{selectedDayISO.replace(/-/g, '/')}</h2>
            <p className="text-[10px] text-gray-300 font-bold uppercase tracking-tight">{selectedDayTasks.length} ITEMS</p>
          </div>
        </div>

        {/* Quick Add Form */}
        <form onSubmit={handleQuickAdd} className="mb-6 flex gap-3">
          <div className="flex-1 nm-inset-sm rounded-2xl px-4 py-2 flex items-center">
            <input
              autoFocus
              className="w-full bg-transparent text-xs font-semibold text-gray-600 focus:outline-none placeholder-gray-300"
              placeholder="快速添加事项..."
              value={quickInput}
              onChange={(e) => setQuickInput(e.target.value)}
            />
          </div>
          <button
            type="submit"
            disabled={!quickInput.trim()}
            className="w-10 h-10 nm-raised rounded-full flex items-center justify-center text-indigo-400 disabled:opacity-30 active:nm-inset transition-all"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </form>

        <div className="flex-1 overflow-y-auto no-scrollbar space-y-4 pb-4 relative">
          {selectedDayTasks.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-300 py-10">
              <div className="w-1 h-1 bg-gray-200 rounded-full mb-2"></div>
              <p className="text-[10px] font-bold tracking-widest uppercase">No tasks for this day</p>
            </div>
          ) : (
            selectedDayTasks.map(task => (
              <TaskItem
                key={task.id}
                task={task}
                onToggle={() => onToggle(task.id)}
                onEdit={() => onEdit(task.id)}
              />
            ))
          )}
        </div>

        {/* 操作按钮 - 当有选中任务时显示 */}
        {selectedDayTasks.some(t => t.selected) && (
          <div className="absolute bottom-6 right-4 animate-in zoom-in duration-300 z-10 flex flex-col gap-3">
            {/* 归档按钮 - 只有未归档的任务才显示 */}
            {selectedDayTasks.some(t => t.selected && !t.archived) && (
              <ArchiveButton onClick={onArchive} />
            )}
            {/* 反归档按钮 - 只有已归档的任务才显示 */}
            {selectedDayTasks.some(t => t.selected && t.archived) && (
              <RevertButton onClick={onRevert} />
            )}
            {/* 删除按钮 - 始终显示 */}
            <DeleteButton onClick={onDelete} />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="nm-raised rounded-[32px] p-6 flex-1 flex flex-col overflow-hidden animate-in fade-in duration-500">
      {/* Calendar Header Controls */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex gap-4">
          <button onClick={prevMonth} className="w-10 h-10 nm-raised rounded-full flex items-center justify-center text-gray-400 active:nm-inset">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M15 19l-7-7 7-7" strokeWidth="3" /></svg>
          </button>
          <button onClick={nextMonth} className="w-10 h-10 nm-raised rounded-full flex items-center justify-center text-gray-400 active:nm-inset">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" strokeWidth="3" /></svg>
          </button>
        </div>

        <div className="flex gap-3">
          <div className="nm-raised px-4 py-2 rounded-2xl flex items-center gap-2">
            <span className="text-xs font-bold text-gray-600 tracking-tight">{monthName}</span>
            <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 9l-7 7-7-7" strokeWidth="3" /></svg>
          </div>
          <div className="nm-raised px-4 py-2 rounded-2xl flex items-center gap-2">
            <span className="text-xs font-bold text-gray-600 tracking-tight">{year}</span>
            <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 9l-7 7-7-7" strokeWidth="3" /></svg>
          </div>
        </div>
      </div>

      {/* Grid Header */}
      <div className="grid grid-cols-7 mb-4 text-center">
        {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map(day => (
          <span key={day} className="text-[10px] font-bold text-gray-400 tracking-widest">{day}</span>
        ))}
      </div>

      {/* Grid Days */}
      <div className="nm-inset rounded-[24px] p-4 flex-1">
        <div className="grid grid-cols-7 gap-y-2 h-full overflow-y-auto no-scrollbar">
          {renderDays()}
        </div>
      </div>

      {/* Legend */}
      <div className="mt-6 flex items-center justify-center gap-6">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
          <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Finished</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-orange-400" />
          <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Pending</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-red-400" />
          <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Urgent</span>
        </div>
      </div>
    </div>
  );
};

export default CalendarView;
