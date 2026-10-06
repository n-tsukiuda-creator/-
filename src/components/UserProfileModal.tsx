import React, { useState } from 'react';
import { X, User, Check, Users, Shield, Clock } from 'lucide-react';
import { Collaborator } from '../types';
import { CurrentUserProfile } from '../hooks/useRealtimeCollaboration';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: CurrentUserProfile;
  collaborators: Collaborator[];
  onSaveProfile: (name: string, role: string, color: string) => void;
}

const PRESET_ROLES = [
  '工場管理 / 現場主任',
  'CAM / 展開図面設計',
  'レーザー・複合機 切断班',
  'NCプレスブレーキ ベンダー班',
  'TIG・半自動 溶接班',
  '仕上・塗装・タップ班',
  '製品検査・出荷係',
];

const COLOR_OPTIONS = [
  '#3B82F6', // Blue
  '#10B981', // Emerald
  '#F59E0B', // Amber
  '#EF4444', // Red
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#06B6D4', // Cyan
  '#14B8A6', // Teal
  '#E11D48', // Rose
  '#64748B', // Slate
];

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  collaborators,
  onSaveProfile,
}) => {
  const [name, setName] = useState(currentUser.name);
  const [role, setRole] = useState(currentUser.role);
  const [color, setColor] = useState(currentUser.color);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSaveProfile(name.trim(), role.trim(), color);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in">
      <div className="bg-slate-900 border border-slate-700 rounded-lg shadow-2xl w-full max-w-md text-slate-100 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 bg-slate-850 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-white shadow-sm"
              style={{ backgroundColor: color }}
            >
              {name.charAt(0) || '作'}
            </div>
            <div>
              <h2 className="text-base font-bold text-white">共同入力者プロフィールの設定</h2>
              <p className="text-xs text-slate-400">
                現場で他の作業者に表示される名前と担当工程
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 custom-scrollbar">
          {/* User Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              作業者氏名 / ニックネーム <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="例: 佐藤、田中(レーザー)、山田"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-xs text-slate-100 font-bold focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Department / Role */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              担当部署 / 作業工程
            </label>
            <input
              type="text"
              placeholder="担当部署を入力または下記から選択"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-xs text-slate-200 mb-2 focus:outline-none focus:border-amber-500"
            />
            {/* Role quick suggestions */}
            <div className="flex flex-wrap gap-1.5">
              {PRESET_ROLES.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRole(r)}
                  className={`px-2 py-0.5 rounded text-[11px] transition-colors cursor-pointer ${
                    role === r
                      ? 'bg-amber-500 text-slate-950 font-bold'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* Avatar Color */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              アイコン識別カラー
            </label>
            <div className="flex items-center gap-2 flex-wrap">
              {COLOR_OPTIONS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  style={{ backgroundColor: c }}
                  className={`w-7 h-7 rounded-full cursor-pointer flex items-center justify-center transition-transform ${
                    color === c ? 'ring-2 ring-white scale-110' : 'opacity-80 hover:opacity-100'
                  }`}
                >
                  {color === c && <Check className="w-3.5 h-3.5 text-white" />}
                </button>
              ))}
            </div>
          </div>

          {/* Active Collaborators Section */}
          <div className="pt-3 border-t border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
              <span className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-emerald-400" />
                現在オンラインの作業者 ({collaborators.length} 人)
              </span>
            </div>

            <div className="bg-slate-950/80 rounded border border-slate-800 p-2 divide-y divide-slate-800/60 max-h-36 overflow-y-auto custom-scrollbar">
              {collaborators.length === 0 ? (
                <div className="text-xs text-slate-500 py-1 px-2">
                  現在他の作業者は接続していません
                </div>
              ) : (
                collaborators.map((c) => {
                  const isSelf = c.id === currentUser.id;
                  return (
                    <div
                      key={c.id}
                      className="py-1.5 px-2 flex items-center justify-between gap-2 text-xs"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: c.color }}
                        />
                        <span className="font-bold text-slate-200 truncate">
                          {c.name} {isSelf && <span className="text-amber-400 font-normal">(あなた)</span>}
                        </span>
                        <span className="text-[11px] text-slate-400 truncate">
                          · {c.role}
                        </span>
                      </div>
                      <span className="flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-950/50 px-1.5 py-0.5 rounded border border-emerald-900/60">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        接続中
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 text-xs text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors cursor-pointer"
            >
              キャンセル
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded transition-colors cursor-pointer"
            >
              プロフィールを更新
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
