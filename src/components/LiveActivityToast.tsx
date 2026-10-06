import React from 'react';
import { ActivityNotification } from '../types';
import { Bell } from 'lucide-react';

interface LiveActivityToastProps {
  notifications: ActivityNotification[];
}

export const LiveActivityToast: React.FC<LiveActivityToastProps> = ({ notifications }) => {
  if (notifications.length === 0) return null;

  return (
    <div className="fixed top-16 right-4 z-50 flex flex-col gap-2 pointer-events-none max-w-sm w-full">
      {notifications.map((notif) => (
        <div
          key={notif.id}
          className="bg-slate-900/95 border border-slate-700/80 shadow-2xl rounded px-3.5 py-2 text-xs text-slate-100 flex items-center gap-2.5 backdrop-blur-md animate-in slide-in-from-top-2 duration-200 pointer-events-auto"
        >
          <div
            className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0 shadow-xs"
            style={{ backgroundColor: notif.userColor || '#F59E0B' }}
          >
            {notif.userName.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <span className="font-bold text-amber-400 mr-1.5">{notif.userName}</span>
            <span className="text-slate-200">{notif.message}</span>
          </div>
          <Bell className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
        </div>
      ))}
    </div>
  );
};
