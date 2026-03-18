"use client";

import { useState, FormEvent } from 'react';
import { X, Send, CheckCircle2 } from 'lucide-react';

interface MessageModalProps {
  recipientName: string;
  recipientEmail: string;
  onClose: () => void;
}

export default function MessageModal({ recipientName, recipientEmail, onClose }: MessageModalProps) {
  const [subject, setSubject] = useState('Interested in your property inquiry');
  const [body, setBody] = useState('');
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);

  const handleSend = async (e: FormEvent) => {
    e.preventDefault();
    if (!body.trim()) return;
    setSending(true);
    // Simulate send — replace with a real /api/messages route when ready
    await new Promise(res => setTimeout(res, 900));
    setSent(true);
    setSending(false);
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-gray-900 border border-white/10 rounded-2xl shadow-2xl w-full max-w-lg animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-white/[0.07]">
          <div>
            <h2 className="text-white font-bold text-lg">Send Message</h2>
            <p className="text-gray-400 text-sm">To: <span className="text-blue-400 font-medium">{recipientName}</span></p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/10 text-gray-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {sent ? (
          <div className="flex flex-col items-center justify-center py-12 text-center px-6">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mb-4">
              <CheckCircle2 className="w-8 h-8 text-emerald-400" />
            </div>
            <p className="text-white font-bold text-lg mb-1">Message Sent!</p>
            <p className="text-gray-400 text-sm mb-6">Your message was delivered to {recipientName}.</p>
            <button onClick={onClose} className="bg-gray-800 hover:bg-gray-700 text-white font-medium px-6 py-2.5 rounded-xl text-sm transition-colors">
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={handleSend} className="p-6 flex flex-col gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Subject</label>
              <input
                type="text"
                value={subject}
                onChange={e => setSubject(e.target.value)}
                className="w-full bg-gray-800/60 border border-white/[0.08] focus:border-blue-500/50 rounded-xl px-4 py-2.5 text-white text-sm outline-none transition-colors"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Message</label>
              <textarea
                value={body}
                onChange={e => setBody(e.target.value)}
                rows={5}
                placeholder={`Hi ${recipientName}, I noticed you showed interest in one of our properties...`}
                className="w-full bg-gray-800/60 border border-white/[0.08] focus:border-blue-500/50 rounded-xl px-4 py-3 text-white text-sm outline-none transition-colors resize-none placeholder:text-gray-600"
                required
              />
            </div>
            <div className="flex items-center justify-between text-xs text-gray-500 -mt-2">
              <span>Sending via: <span className="text-gray-400">{recipientEmail}</span></span>
              <span>{body.length}/1000</span>
            </div>
            <div className="flex gap-3 pt-1">
              <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white font-medium text-sm transition-colors">
                Cancel
              </button>
              <button
                type="submit"
                disabled={sending || !body.trim()}
                className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white font-bold text-sm transition-colors flex items-center justify-center gap-2"
              >
                {sending ? (
                  <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Sending…</>
                ) : (
                  <><Send className="w-4 h-4" /> Send Message</>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
