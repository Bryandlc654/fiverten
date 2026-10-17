'use client';

import { useState } from 'react';
import { TASKS } from './sample-data';

export default function TasksCard() {
  const [tasks, setTasks] = useState(TASKS);
  const completedTasks = tasks.filter((task) => task.done).length;

  function toggleTask(index: number) {
    setTasks((current) =>
      current.map((task, i) => (i === index ? { ...task, done: !task.done } : task)),
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-bold text-slate-900">Tareas pendientes</h3>
        <span className="text-xs font-semibold text-slate-500">
          {completedTasks}/{tasks.length}
        </span>
      </div>
      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-[#2563eb] transition-all"
          style={{ width: `${(completedTasks / tasks.length) * 100}%` }}
        />
      </div>
      <ul className="mt-4 space-y-2">
        {tasks.map((task, index) => (
          <li key={task.label}>
            <button
              type="button"
              onClick={() => toggleTask(index)}
              className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition hover:bg-slate-50"
            >
              <span
                className={`material-symbols-outlined text-[20px] ${
                  task.done ? 'text-emerald-500' : 'text-slate-300'
                }`}
              >
                {task.done ? 'check_circle' : 'radio_button_unchecked'}
              </span>
              <span
                className={`text-sm ${
                  task.done ? 'text-slate-400 line-through' : 'text-slate-700'
                }`}
              >
                {task.label}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
