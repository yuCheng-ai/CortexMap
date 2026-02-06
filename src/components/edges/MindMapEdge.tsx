import { BaseEdge, EdgeProps, getBezierPath } from '@xyflow/react';

export function MindMapEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
}: EdgeProps) {
  // 专门为思维导图优化的 Bezier 曲线
  // 我们希望曲线在水平方向上更有拉伸感
  const [edgePath] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    curvature: 0.5, // 增加曲率，使线条更柔和
  });

  return (
    <BaseEdge
      id={id}
      path={edgePath}
      style={{
        ...style,
        strokeWidth: style.strokeWidth || 3,
        stroke: style.stroke || '#94a3b8',
        opacity: 0.9,
        transition: 'stroke-width 0.3s ease',
      }}
    />
  );
}
