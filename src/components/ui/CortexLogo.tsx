import React from 'react';

export const CortexLogo = ({ size = 32, className = "" }: { size?: number, className?: string }) => {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 100 100" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#3b82f6" />
          <stop offset="100%" stopColor="#8b5cf6" />
        </linearGradient>
        <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {/* 外层神经元轮廓 */}
      <circle cx="50" cy="50" r="45" stroke="url(#logoGradient)" strokeWidth="1.5" strokeDasharray="4 2" opacity="0.3" />
      
      {/* 核心节点 - 代表 Cortex */}
      <circle cx="50" cy="50" r="12" fill="url(#logoGradient)" filter="url(#glow)" />
      
      {/* 延伸的思维分支 */}
      <path d="M50 38 L50 20" stroke="url(#logoGradient)" strokeWidth="3" strokeLinecap="round" opacity="0.8" />
      <path d="M50 62 L50 80" stroke="url(#logoGradient)" strokeWidth="3" strokeLinecap="round" opacity="0.8" />
      <path d="M62 50 L80 50" stroke="url(#logoGradient)" strokeWidth="3" strokeLinecap="round" opacity="0.8" />
      <path d="M38 50 L20 50" stroke="url(#logoGradient)" strokeWidth="3" strokeLinecap="round" opacity="0.8" />
      
      {/* 斜向分支 */}
      <path d="M58.5 41.5 L70 30" stroke="url(#logoGradient)" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
      <path d="M41.5 58.5 L30 70" stroke="url(#logoGradient)" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
      <path d="M58.5 58.5 L70 70" stroke="url(#logoGradient)" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
      <path d="M41.5 41.5 L30 30" stroke="url(#logoGradient)" strokeWidth="2" strokeLinecap="round" opacity="0.6" />

      {/* 末端小节点 - 代表知识点 */}
      <circle cx="50" cy="20" r="3" fill="#3b82f6" />
      <circle cx="80" cy="50" r="3" fill="#8b5cf6" />
      <circle cx="50" cy="80" r="3" fill="#3b82f6" />
      <circle cx="20" cy="50" r="3" fill="#8b5cf6" />
    </svg>
  );
};
