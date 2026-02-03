import React from 'react';

type LogoVariant = 'slanted-mobius' | 'mobius-flow' | 'interlocked-links' | 'symmetric-orbit' | 'rotated-refined-arcs' | 'refined-arcs' | 'staggered-arcs' | 'geometric-knot' | 'infinity-loop' | 'loop-symmetry' | 'pure-flat' | 'minimal-arcs';

export const CortexLogo = ({ size = 32, className = "", variant = 'slanted-mobius' }: { size?: number, className?: string, variant?: LogoVariant }) => {
  const renderLogo = () => {
    switch (variant) {
      case 'slanted-mobius':
        return (
          <g transform="rotate(-45, 50, 50)">
            {/* 关键词：循环、线条、对称、斜向 (Slanted Mobius) */}
            {/* 异化处理：整体旋转 45 度，打破常规水平视角，增加动感 */}
            <path 
              d="M20 70 C 20 20, 80 80, 80 30" 
              stroke="#3b82f6" 
              strokeWidth="11" 
              strokeLinecap="round" 
              fill="none"
            />
            <path 
              d="M20 30 C 20 80, 80 20, 80 70" 
              stroke="white" 
              strokeWidth="11" 
              strokeLinecap="round" 
              fill="none"
              strokeOpacity="0.85"
            />
          </g>
        );
      case 'mobius-flow':
        return (
          <g>
            {/* 关键词：循环、线条、对称 (Mobius Flow) */}
            {/* 彻底去“眼球”与“窗户”化：采用莫比乌斯环式的交织曲线 */}
            {/* 蓝色曲线：从左下到右上的主流动线 */}
            <path 
              d="M20 70 C 20 20, 80 80, 80 30" 
              stroke="#3b82f6" 
              strokeWidth="10" 
              strokeLinecap="round" 
              fill="none"
            />
            {/* 白色曲线：对称的交织线，形成循环感 */}
            <path 
              d="M20 30 C 20 80, 80 20, 80 70" 
              stroke="white" 
              strokeWidth="10" 
              strokeLinecap="round" 
              fill="none"
              strokeOpacity="0.8"
            />
          </g>
        );
      case 'interlocked-links':
        return (
          <g>
            {/* 关键词：循环、线条、对称 (Interlocked Links) */}
            {/* 彻底去眼球化：采用平行线条与半圆组合，形成类似链条互锁的平面结构 */}
            {/* 蓝色部分：左侧 U 型 */}
            <path 
              d="M40 25 H25 V75 H40" 
              stroke="#3b82f6" 
              strokeWidth="10" 
              strokeLinecap="round" 
              fill="none"
            />
            {/* 白色部分：右侧 U 型，与蓝色交错 */}
            <path 
              d="M60 25 H75 V75 H60" 
              stroke="white" 
              strokeWidth="10" 
              strokeLinecap="round" 
              fill="none"
              strokeOpacity="0.9"
            />
            {/* 链接线条：形成循环感 */}
            <line x1="40" y1="25" x2="60" y2="25" stroke="#3b82f6" strokeWidth="10" strokeLinecap="round" opacity="0.5" />
            <line x1="40" y1="75" x2="60" y2="75" stroke="white" strokeWidth="10" strokeLinecap="round" opacity="0.5" />
          </g>
        );
      case 'symmetric-orbit':
        return (
          <g>
            {/* 关键词：循环、线条、对称 (Symmetric Orbit) */}
            {/* 摒弃错位，采用完美的同心/轴对称结构 */}
            {/* 外层蓝色弧线 - 代表探索与映射 */}
            <path 
              d="M20 50 A30 30 0 1 1 80 50" 
              stroke="#3b82f6" 
              strokeWidth="8" 
              strokeLinecap="round" 
              fill="none"
            />
            {/* 内层白色弧线 - 代表核心与逻辑，与外层完美轴对称 */}
            <path 
              d="M35 50 A15 15 0 1 0 65 50" 
              stroke="white" 
              strokeWidth="8" 
              strokeLinecap="round" 
              fill="none"
              strokeOpacity="0.9"
            />
            {/* 中心锚点 - 绝对中心对称 */}
            <circle cx="50" cy="50" r="4" fill="#3b82f6" />
          </g>
        );
      case 'rotated-refined-arcs':
        return (
          <g>
            {/* 关键词：循环、线条、对称 (Rotated Refined Arcs) */}
            {/* 翻转 90 度：左右对称变为上下贯通，类似 S 链或 DNA 螺旋的横截面 */}
            {/* 蓝色主弧：从右侧环绕 */}
            <path 
              d="M45 74 A22 22 0 1 1 45 30" 
              stroke="#3b82f6" 
              strokeWidth="11" 
              strokeLinecap="round" 
              fill="none"
            />
            {/* 白色副弧：从左侧环绕 */}
            <path 
              d="M55 26 A22 22 0 1 1 55 70" 
              stroke="white" 
              strokeWidth="11" 
              strokeLinecap="round" 
              fill="none"
              strokeOpacity="0.95"
            />
            {/* 核心点：保持中心稳定 */}
            <circle cx="50" cy="50" r="5" fill="#3b82f6" />
          </g>
        );
      case 'refined-arcs':
        return (
          <g>
            {/* 关键词：循环、线条、对称 (Refined Arcs) */}
            {/* 微调版：优化弧度比例，增加内扣感，强化“拥抱”与“循环”的视觉隐喻 */}
            {/* 蓝色主弧：更饱满，占据主导 */}
            <path 
              d="M30 45 A22 22 0 1 1 74 45" 
              stroke="#3b82f6" 
              strokeWidth="11" 
              strokeLinecap="round" 
              fill="none"
            />
            {/* 白色副弧：完美契合，形成太极般的动态平衡 */}
            <path 
              d="M70 55 A22 22 0 1 1 26 55" 
              stroke="white" 
              strokeWidth="11" 
              strokeLinecap="round" 
              fill="none"
              strokeOpacity="0.95"
            />
            {/* 核心点：点睛之笔，强化中心引力 */}
            <circle cx="50" cy="50" r="5" fill="#3b82f6" />
          </g>
        );
      case 'staggered-arcs':
        return (
          <g>
            {/* 关键词：循环、线条、对称 (Staggered Arcs) */}
            {/* 极致极简：两个错位的半圆弧，上下对称，仿佛在追逐循环 */}
            <path 
              d="M30 40 A20 20 0 1 1 70 40" 
              stroke="#3b82f6" 
              strokeWidth="10" 
              strokeLinecap="round" 
              fill="none"
            />
            <path 
              d="M70 60 A20 20 0 1 1 30 60" 
              stroke="white" 
              strokeWidth="10" 
              strokeLinecap="round" 
              fill="none"
              strokeOpacity="0.9"
            />
          </g>
        );
      case 'geometric-knot':
        return (
          <g>
            {/* 关键词：循环、线条、对称 (Geometric Knot) */}
            {/* 极其清爽的线性几何：两个 U 型线条对称交错，形成稳重的正方形结构 */}
            <path 
              d="M30 40 V25 H70 V40 M70 60 V75 H30 V60" 
              stroke="#3b82f6" 
              strokeWidth="10" 
              strokeLinecap="square" 
              fill="none"
            />
            <path 
              d="M40 30 H25 V70 H40 M60 70 H75 V30 H60" 
              stroke="white" 
              strokeWidth="10" 
              strokeLinecap="square" 
              fill="none"
              strokeOpacity="0.9"
            />
          </g>
        );
      case 'infinity-loop':
        return (
          <g>
            {/* 关键词：循环、线条、对称 (Infinity Loop) */}
            {/* 极简平面：一条连续的 8 字型线条，代表无限循环和逻辑对称 */}
            <path 
              d="M30 50 A15 15 0 1 1 50 50 A15 15 0 1 0 70 50 A15 15 0 1 0 50 50 A15 15 0 1 1 30 50" 
              stroke="#3b82f6" 
              strokeWidth="12" 
              strokeLinecap="round" 
              fill="none"
            />
          </g>
        );
      case 'loop-symmetry':
        return (
          <g>
            {/* 关键词：循环、线条、对称 */}
            {/* 采用两个对称嵌套的 270 度圆弧，形成无限循环的流动感 */}
            <path 
              d="M30 50 A20 20 0 1 1 50 70" 
              stroke="#3b82f6" 
              strokeWidth="10" 
              strokeLinecap="round" 
              fill="none"
            />
            <path 
              d="M70 50 A20 20 0 1 1 50 30" 
              stroke="white" 
              strokeWidth="10" 
              strokeLinecap="round" 
              fill="none"
            />
            {/* 中心对称点 */}
            <circle cx="50" cy="50" r="5" fill="#3b82f6" />
          </g>
        );
      case 'pure-flat':
        return (
          <g>
            {/* 极致极简平面风格：一个实心圆加一个偏移的小圆点 */}
            {/* 没有任何渐变、阴影或复杂线条，纯粹的平面矢量 */}
            <circle cx="50" cy="50" r="45" fill="#3b82f6" />
            <circle cx="70" cy="30" r="12" fill="white" />
          </g>
        );
      case 'minimal-arcs':
      default:
        return (
          <g>
            <path d="M20 50 A30 30 0 1 1 80 50" stroke="#3b82f6" strokeWidth="12" strokeLinecap="round" />
            <path d="M80 50 A30 30 0 1 1 20 50" stroke="white" strokeWidth="12" strokeLinecap="round" strokeOpacity="0.9" />
            <circle cx="50" cy="50" r="6" fill="#3b82f6" />
          </g>
        );
    }
  };

  return (
    <div style={{ position: 'relative', width: size, height: size }} className={className}>
      <svg 
        width={size} 
        height={size} 
        viewBox="0 0 100 100" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
      >
        {renderLogo()}
      </svg>
    </div>
  );
};
