/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Bot } from 'lucide-react';
import mascotImage from '../assets/images/edubot_mascot_3d_1793780438112.jpg';

interface EduBotMascotProps {
  expression?: 'happy' | 'thinking' | 'explaining' | 'celebrating';
  message?: string;
  size?: 'sm' | 'md' | 'lg';
  interactive?: boolean;
  onTalkClick?: () => void;
}

export const EduBotMascot: React.FC<EduBotMascotProps> = ({
  expression = 'happy',
  message,
  size = 'md',
  interactive = true,
  onTalkClick,
}) => {
  const [imgFailed, setImgFailed] = useState(false);

  const sizeClasses = {
    sm: 'w-16 h-16',
    md: 'w-28 h-28',
    lg: 'w-44 h-44',
  };

  return (
    <div className="flex flex-col items-center">
      <div className="relative group">
        {/* Holographic glowing ring */}
        <div
          className={`absolute -inset-1.5 rounded-full blur-md opacity-70 transition duration-500 ${
            expression === 'celebrating'
              ? 'bg-gradient-to-r from-amber-400 via-pink-500 to-cyan-400'
              : expression === 'thinking'
              ? 'bg-gradient-to-r from-purple-500 to-indigo-500'
              : 'bg-gradient-to-r from-cyan-400 to-blue-500'
          }`}
        />

        {/* 3D Robot Image Container */}
        <motion.div
          whileHover={interactive ? { scale: 1.05 } : {}}
          whileTap={interactive ? { scale: 0.96 } : {}}
          animate={
            expression === 'thinking'
              ? { y: [0, -4, 0] }
              : expression === 'celebrating'
              ? { y: [0, -8, 0], rotate: [0, -2, 2, 0] }
              : { y: [0, -3, 0] }
          }
          transition={{ repeat: Infinity, duration: expression === 'thinking' ? 2 : 3, ease: 'easeInOut' }}
          className={`relative ${sizeClasses[size]} rounded-2xl overflow-hidden border-2 border-cyan-400/80 shadow-lg shadow-cyan-500/20 bg-slate-900 cursor-pointer flex items-center justify-center`}
          onClick={onTalkClick}
        >
          {!imgFailed ? (
            <img
              src={mascotImage}
              alt="EduBot 3D Robot Mascot"
              onError={() => setImgFailed(true)}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-cyan-600/30 to-indigo-900 flex items-center justify-center">
              <Bot className="w-1/2 h-1/2 text-cyan-300" />
            </div>
          )}

          {/* LED Expression status indicator */}
          <div className="absolute bottom-1 right-1 bg-slate-950/80 backdrop-blur-sm px-1.5 py-0.5 rounded-md border border-cyan-500/40 flex items-center gap-1">
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                expression === 'thinking'
                  ? 'bg-purple-400'
                  : expression === 'celebrating'
                  ? 'bg-amber-400'
                  : 'bg-cyan-400'
              }`}
            />
            <span className="text-[10px] font-medium text-cyan-200 uppercase tracking-wider font-mono">
              {expression === 'thinking' ? 'AI THINK' : 'EDUBOT'}
            </span>
          </div>
        </motion.div>
      </div>

      {/* Speech Bubble / Dialogue Message */}
      {message && (
        <motion.div
          initial={{ opacity: 0, y: 8, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          className="mt-3 max-w-sm text-center relative"
        >
          <div className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-md px-4 py-2.5 rounded-xl border border-cyan-200 dark:border-cyan-800/60 shadow-md text-xs sm:text-sm text-slate-800 dark:text-slate-100 font-medium">
            {message}
          </div>
          {/* Arrow */}
          <div className="w-2.5 h-2.5 bg-white dark:bg-slate-800 border-t border-l border-cyan-200 dark:border-cyan-800/60 rotate-45 mx-auto -mt-1.5" />
        </motion.div>
      )}
    </div>
  );
};
