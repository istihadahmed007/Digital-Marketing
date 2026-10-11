'use client';

import React, { useState, useEffect } from 'react';
import { Task, TaskStatus } from '@/lib/types/crm';
import { getTasks, updateTaskStatus } from '@/lib/actions/tasks';
import { TaskModal } from '@/components/crm/TaskModal';
import { StatusBadge } from '@/components/crm/StatusBadge';
import { EmptyState } from '@/components/crm/EmptyState';
import {
  CheckSquare,
  Square,
  Plus,
  Clock,
  Filter,
  Loader2,
} from 'lucide-react';

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [workspaceId] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return (
        localStorage.getItem('nexusmark_active_workspace') || 'ws-default'
      );
    }
    return 'ws-default';
  });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchTasks = async (wsId: string) => {
    setLoading(true);
    try {
      const list = await getTasks(wsId, {
        status: statusFilter,
      });
      setTasks(list);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks(workspaceId);
  }, [workspaceId, statusFilter]);

  const handleToggleStatus = async (task: Task) => {
    const nextStatus: TaskStatus =
      task.status === 'completed' ? 'pending' : 'completed';

    // Optimistic update
    setTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, status: nextStatus } : t))
    );

    await updateTaskStatus(workspaceId, task.id, nextStatus);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-[#75D2EE]/20 dark:border-slate-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#17364A] dark:text-white">
            Workspace Tasks
          </h1>
          <p className="text-xs text-[#526D7D] dark:text-slate-300 mt-1">
            Track action items, follow-ups, client discovery calls, and deadlines across your team.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-[#167AA0] hover:bg-[#0E526E] text-white shadow-xs glass-button-press transition-all cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Task</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="p-4 rounded-2xl glass-panel flex items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-[#526D7D] dark:text-slate-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 text-xs rounded-xl border border-[#75D2EE]/30 dark:border-slate-700 bg-white/80 dark:bg-slate-800 text-[#17364A] dark:text-white cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-[#167AA0]"
          >
            <option value="all">All Tasks</option>
            <option value="pending">Pending</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
          </select>
        </div>

        <span className="text-xs text-[#526D7D] dark:text-slate-400 font-medium">
          {tasks.length} task{tasks.length === 1 ? '' : 's'}
        </span>
      </div>

      {/* Task List */}
      {loading ? (
        <div className="p-12 flex justify-center text-[#167AA0]">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      ) : tasks.length === 0 ? (
        <EmptyState
          icon={CheckSquare}
          title="No Tasks Found"
          description="Create follow-up tasks to ensure your team never misses a meeting, contract deadline, or client follow-up."
          actionLabel="Create First Task"
          onAction={() => setIsModalOpen(true)}
        />
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => (
            <div
              key={task.id}
              className={`p-4 rounded-2xl border transition-all flex items-center justify-between gap-4 ${
                task.status === 'completed'
                  ? 'bg-white/40 dark:bg-slate-900/30 border-[#75D2EE]/15 dark:border-slate-800/80 opacity-70'
                  : 'glass-panel preview-tile-3d shadow-xs'
              }`}
            >
              <div className="flex items-start gap-3 min-w-0">
                <button
                  onClick={() => handleToggleStatus(task)}
                  className="mt-0.5 text-[#167AA0] dark:text-[#75D2EE] hover:text-[#0E526E] transition-colors cursor-pointer"
                  title={
                    task.status === 'completed'
                      ? 'Mark as Pending'
                      : 'Mark as Completed'
                  }
                >
                  {task.status === 'completed' ? (
                    <CheckSquare className="w-5 h-5 text-emerald-500" />
                  ) : (
                    <Square className="w-5 h-5 text-[#526D7D]/60 hover:text-[#167AA0]" />
                  )}
                </button>

                <div className="min-w-0">
                  <h3
                    className={`text-xs font-bold ${
                      task.status === 'completed'
                        ? 'line-through text-[#526D7D]/60 dark:text-slate-500'
                        : 'text-[#17364A] dark:text-white'
                    }`}
                  >
                    {task.title}
                  </h3>
                  {task.description && (
                    <p className="text-xs text-[#526D7D] dark:text-slate-400 mt-0.5 line-clamp-1">
                      {task.description}
                    </p>
                  )}
                  {task.due_date && (
                    <p className="text-[11px] text-[#526D7D] dark:text-slate-400 mt-1 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-[#167AA0]/70" />
                      <span>
                        Due {new Date(task.due_date).toLocaleDateString()}
                      </span>
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <StatusBadge status={task.priority} type="priority" />
                <StatusBadge status={task.status} type="task_status" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Task Modal */}
      <TaskModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        workspaceId={workspaceId}
        onSuccess={() => fetchTasks(workspaceId)}
      />
    </div>
  );
}
