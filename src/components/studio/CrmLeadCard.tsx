"use client";

import { useState } from 'react';
import { Heart, MessageCircle, Mail, Phone, MessageSquare, ChevronDown, ChevronUp } from 'lucide-react';
import MessageModal from './MessageModal';

export interface CrmInteractor {
  user: {
    id: string;
    fullName: string;
    email: string;
    country: string | null;
    phoneNumber: string | null;
    phoneCode: string | null;
    role: string;
  };
  likes: { videoTitle: string }[];
  comments: { videoTitle: string }[];
  totalInteractions: number;
}

interface CrmLeadCardProps {
  lead: CrmInteractor;
}

export default function CrmLeadCard({ lead }: CrmLeadCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [messageOpen, setMessageOpen] = useState(false);
  const { user, likes, comments, totalInteractions } = lead;
  const initials = user.fullName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  const interestScore = Math.min(100, totalInteractions * 15);
  const scoreColor = interestScore >= 70 ? 'bg-emerald-500' : interestScore >= 40 ? 'bg-yellow-500' : 'bg-blue-500';

  return (
    <>
      <div className="bg-gray-900/80 border border-white/[0.07] rounded-2xl p-4 hover:border-white/15 transition-all">
        {/* Header Row */}
        <div className="flex items-center gap-4">
          {/* Avatar */}
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0 shadow-lg">
            {initials}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-white font-semibold text-sm truncate">{user.fullName}</p>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 uppercase`}>
                {user.role}
              </span>
            </div>
            <p className="text-gray-500 text-xs truncate">{user.email}</p>
            {user.country && <p className="text-gray-600 text-xs">{user.country}</p>}
          </div>

          {/* Interaction stats */}
          <div className="flex items-center gap-3 flex-shrink-0">
            {likes.length > 0 && (
              <div className="flex items-center gap-1 text-red-400 text-xs font-medium">
                <Heart className="w-3.5 h-3.5" /> {likes.length}
              </div>
            )}
            {comments.length > 0 && (
              <div className="flex items-center gap-1 text-blue-400 text-xs font-medium">
                <MessageCircle className="w-3.5 h-3.5" /> {comments.length}
              </div>
            )}
          </div>

          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1.5 rounded-lg hover:bg-white/5 text-gray-500 transition-colors ml-1"
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>

        {/* Interest score bar */}
        <div className="mt-3 mb-1">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-500 font-medium">Interest Score</span>
            <span className="text-xs text-gray-400 font-bold">{interestScore}%</span>
          </div>
          <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${scoreColor}`}
              style={{ width: `${interestScore}%` }}
            />
          </div>
        </div>

        {/* Expanded details */}
        {expanded && (
          <div className="mt-4 pt-4 border-t border-white/[0.06] flex flex-col gap-3">
            {likes.length > 0 && (
              <div>
                <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide mb-1.5">Liked Videos</p>
                {likes.slice(0, 3).map((l, i) => (
                  <p key={i} className="text-xs text-gray-400 line-clamp-1 flex items-center gap-1.5">
                    <Heart className="w-3 h-3 text-red-400 flex-shrink-0" /> {l.videoTitle}
                  </p>
                ))}
              </div>
            )}
            {comments.length > 0 && (
              <div>
                <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide mb-1.5">Commented On</p>
                {comments.slice(0, 3).map((c, i) => (
                  <p key={i} className="text-xs text-gray-400 line-clamp-1 flex items-center gap-1.5">
                    <MessageCircle className="w-3 h-3 text-blue-400 flex-shrink-0" /> {c.videoTitle}
                  </p>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-2 mt-4 pt-3 border-t border-white/[0.06]">
          <button
            onClick={() => setMessageOpen(true)}
            className="flex-1 flex items-center justify-center gap-1.5 bg-blue-600/10 hover:bg-blue-600/20 border border-blue-500/20 text-blue-400 font-semibold text-xs py-2 rounded-xl transition-colors"
          >
            <MessageSquare className="w-3.5 h-3.5" /> Message
          </button>
          <a
            href={`mailto:${user.email}`}
            className="flex-1 flex items-center justify-center gap-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 font-semibold text-xs py-2 rounded-xl transition-colors"
          >
            <Mail className="w-3.5 h-3.5" /> Email
          </a>
          {user.phoneNumber && (
            <a
              href={`tel:${user.phoneCode ?? ''}${user.phoneNumber}`}
              className="flex-1 flex items-center justify-center gap-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-400 font-semibold text-xs py-2 rounded-xl transition-colors"
            >
              <Phone className="w-3.5 h-3.5" /> Call
            </a>
          )}
        </div>
      </div>

      {messageOpen && (
        <MessageModal
          recipientName={user.fullName}
          recipientEmail={user.email}
          onClose={() => setMessageOpen(false)}
        />
      )}
    </>
  );
}
