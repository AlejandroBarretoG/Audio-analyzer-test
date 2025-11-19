
import React, { useEffect, useRef } from 'react';
import { SubtitleNode } from '../types';
import { TrashIcon, TranslateIcon } from './Icons';

interface SubtitleListProps {
  subtitles: SubtitleNode[];
  currentTime: number;
  onJumpTo: (time: number) => void;
  onDelete: (id: string) => void;
}

const formatTime = (seconds: number) => {
  const min = Math.floor(seconds / 60);
  const sec = Math.floor(seconds % 60);
  return `${min}:${sec.toString().padStart(2, '0')}`;
};

const SubtitleList: React.FC<SubtitleListProps> = ({ subtitles, currentTime, onJumpTo, onDelete }) => {
  const listRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to active subtitle
  useEffect(() => {
    const activeEl = document.getElementById('active-subtitle');
    if (activeEl && listRef.current) {
      activeEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [currentTime]);

  if (subtitles.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-500 p-8 text-center">
        <p className="text-lg font-medium mb-2">No analysis data</p>
        <p className="text-sm">Upload a video and click "Detect Visual Scenes" or "Full Audio Analysis".</p>
      </div>
    );
  }

  const sortedSubtitles = [...subtitles].sort((a, b) => a.timestamp - b.timestamp);

  return (
    <div ref={listRef} className="flex flex-col space-y-3 p-4 h-full overflow-y-auto">
      {sortedSubtitles.map((sub) => {
        const isActive = currentTime >= sub.timestamp && (sub.endTime ? currentTime <= sub.endTime : currentTime < sub.timestamp + 2);
        const isMusic = sub.type === 'music';
        const isScene = sub.type === 'scene';

        return (
          <div
            key={sub.id}
            id={isActive ? 'active-subtitle' : undefined}
            onClick={() => onJumpTo(sub.timestamp)}
            className={`relative flex flex-col rounded-lg border transition-all duration-200 cursor-pointer group overflow-hidden ${
              isActive 
                ? 'bg-blue-950/40 border-blue-500/50 shadow-lg shadow-blue-900/20' 
                : isMusic 
                  ? 'bg-purple-950/20 border-purple-900/50 hover:bg-purple-900/30'
                  : isScene
                    ? 'bg-slate-800/40 border-slate-700 hover:bg-slate-700/40'
                    : 'bg-slate-900/50 border-slate-800 hover:bg-slate-800/50'
            }`}
          >
            {/* Scene Thumbnail Background (Optional) or Layout */}
            <div className="flex">
               {sub.thumbnail && (
                 <div className="w-24 min-w-[96px] bg-black flex items-center justify-center border-r border-slate-700/50 relative">
                   <img src={sub.thumbnail} alt="Scene" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                   <div className="absolute inset-0 bg-gradient-to-r from-transparent to-slate-900/10"></div>
                 </div>
               )}
               
               <div className="flex-1 p-3">
                  {/* Header: Time & Type & Actions */}
                  <div className="flex justify-between items-center mb-1">
                    <div className="flex items-center gap-2">
                      <span className={`font-mono text-xs font-bold px-1.5 py-0.5 rounded ${
                        isMusic ? 'text-purple-300 bg-purple-900/50' : 'text-blue-300 bg-blue-900/50'
                      }`}>
                        {formatTime(sub.timestamp)}
                      </span>
                      {sub.endTime && (
                        <span className="text-xs text-slate-500">- {formatTime(sub.endTime)}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] uppercase tracking-wider font-bold text-slate-500">
                        {sub.type}
                      </span>
                      
                      {/* Action Buttons */}
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={(e) => { e.stopPropagation(); onDelete(sub.id); }}
                          className="p-1 text-slate-600 hover:text-red-400 transition-colors"
                          title="Delete"
                        >
                          <TrashIcon className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex flex-col gap-1">
                    <div className="text-sm text-slate-300 leading-snug">
                      {sub.speaker && <span className="text-blue-400 font-semibold mr-1">{sub.speaker}:</span>}
                      {sub.text}
                    </div>
                    
                    {/* Translated Text */}
                    {sub.translation && (
                      <div className="flex items-start gap-1.5 mt-1 pt-1 border-t border-slate-800/50 animate-in fade-in slide-in-from-top-1 duration-300">
                        <TranslateIcon className="w-3 h-3 text-emerald-500 mt-0.5 flex-shrink-0" />
                        <span className="text-sm text-emerald-300 italic leading-snug">
                          {sub.translation}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Dialogue Metadata */}
                  {sub.type === 'dialogue' && sub.emotion && (
                    <div className="flex gap-2 mt-2">
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                        Emotion: {sub.emotion}
                      </span>
                    </div>
                  )}

                  {/* Deep Music Analysis */}
                  {isMusic && sub.musicAnalysis && (
                    <div className="grid grid-cols-2 gap-1 mt-2 pt-2 border-t border-slate-800/50">
                      <div className="text-[10px] text-slate-400">
                        <span className="block text-slate-600">Mode</span> {sub.musicAnalysis.harmonicMode}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        <span className="block text-slate-600">Tempo</span> {sub.musicAnalysis.tempo}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        <span className="block text-slate-600">Dynamics</span> {sub.musicAnalysis.dynamics}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        <span className="block text-slate-600">Sentiment</span> 
                        <span className={sub.musicAnalysis.sentimentScore > 0 ? 'text-green-400' : 'text-red-400'}>
                          {sub.musicAnalysis.sentimentScore}
                        </span>
                      </div>
                    </div>
                  )}
               </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default SubtitleList;
