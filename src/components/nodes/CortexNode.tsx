import { memo } from 'react';
import { Handle, Position, Node, NodeProps } from '@xyflow/react';
import { Brain, Database, Search, Activity, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

export type CortexNodeData = {
  label: string;
  type: 'logic' | 'memory' | 'evidence' | 'execution' | 'plan' | 'reflection';
  status: 'pending' | 'loading' | 'completed' | 'error' | 'active';
  description?: string;
  promptOverride?: string;
  side?: 'left' | 'right' | 'root';
  level?: number;
  branchColor?: string;
};

export type CortexNodeProps = Node<CortexNodeData>;

const typeConfig = {
  logic: {
    icon: Brain,
    color: '#3b82f6',
    borderColor: '#2563eb',
    shadow: '0 10px 15px -3px rgba(59, 130, 246, 0.2)',
  },
  memory: {
    icon: Database,
    color: '#10b981',
    borderColor: '#059669',
    shadow: '0 10px 15px -3px rgba(16, 185, 129, 0.2)',
  },
  evidence: {
    icon: Search,
    color: '#8b5cf6',
    borderColor: '#7c3aed',
    shadow: '0 10px 15px -3px rgba(139, 92, 246, 0.2)',
  },
  execution: {
    icon: Activity,
    color: '#f59e0b',
    borderColor: '#d97706',
    shadow: '0 10px 15px -3px rgba(245, 158, 11, 0.2)',
  },
  plan: {
    icon: Brain,
    color: '#ec4899',
    borderColor: '#db2777',
    shadow: '0 10px 15px -3px rgba(236, 72, 153, 0.2)',
  },
  reflection: {
    icon: Brain,
    color: '#6366f1',
    borderColor: '#4f46e5',
    shadow: '0 10px 15px -3px rgba(99, 102, 241, 0.2)',
  },
};

const statusIcons = {
  pending: null,
  loading: <Loader2 size={12} style={{ animation: 'spin 1s linear infinite', opacity: 0.7 }} />,
  completed: <CheckCircle2 size={12} color="white" />,
  error: <AlertCircle size={12} color="white" />,
  active: <Activity size={12} color="#10b981" />,
};

export const CortexNode = memo(function CortexNode({ data, selected }: NodeProps<CortexNodeProps>) {
  const config = typeConfig[data.type as keyof typeof typeConfig] || typeConfig.logic;
  const Icon = config.icon;
  const StatusIcon = statusIcons[data.status || 'pending'];

  const isActive = selected || data.status === 'active';
  const side = data.side || 'right';
  const branchColor = data.branchColor || config.borderColor;

  return (
    <div 
      className={isActive ? 'node-active' : ''}
      style={{
        padding: '12px 16px',
        borderRadius: '12px',
        border: `2px solid ${isActive ? '#ffffff' : branchColor}`,
        backgroundColor: data.side === 'root' ? '#1e293b' : 'rgba(30, 41, 59, 0.9)', // 根节点深色，子节点半透明
        boxShadow: isActive ? `0 0 20px ${branchColor}` : config.shadow,
        color: 'white',
        width: '260px', 
        fontFamily: 'system-ui, -apple-system, sans-serif',
        transition: 'all 0.3s ease',
        transform: isActive ? 'scale(1.05)' : 'scale(1)',
        wordBreak: 'break-word', 
        whiteSpace: 'normal',    
        position: 'relative',
        backdropFilter: 'blur(8px)',
      }}
    >
      {/* 根节点两侧都有连接点 */}
      {side === 'root' && (
        <>
          <Handle type="target" position={Position.Left} id="left-in" style={{ background: branchColor, border: 'none', width: '8px', height: '8px' }} />
          <Handle type="source" position={Position.Right} id="right-out" style={{ background: branchColor, border: 'none', width: '8px', height: '8px' }} />
          <Handle type="source" position={Position.Left} id="left-out" style={{ background: branchColor, border: 'none', width: '8px', height: '8px' }} />
        </>
      )}

      {/* 右侧分支节点：连线从左边入，右边出 */}
      {side === 'right' && (
        <>
          <Handle type="target" position={Position.Left} id="left-in" style={{ background: branchColor, border: 'none', width: '6px', height: '6px' }} />
          <Handle type="source" position={Position.Right} id="right-out" style={{ background: branchColor, border: 'none', width: '6px', height: '6px' }} />
        </>
      )}

      {/* 左侧分支节点：连线从右边入，左边出 */}
      {side === 'left' && (
        <>
          <Handle type="target" position={Position.Right} id="right-in" style={{ background: branchColor, border: 'none', width: '6px', height: '6px' }} />
          <Handle type="source" position={Position.Left} id="left-out" style={{ background: branchColor, border: 'none', width: '6px', height: '6px' }} />
        </>
      )}
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
        <Icon size={16} style={{ color: branchColor }} />
        <span style={{ 
          fontSize: '10px', 
          textTransform: 'uppercase', 
          letterSpacing: '0.05em', 
          fontWeight: 'bold', 
          color: branchColor,
          opacity: 0.8 
        }}>
          {data.type}
        </span>
        <div style={{ marginLeft: 'auto' }}>
          {StatusIcon}
        </div>
      </div>

      <div style={{ fontSize: '14px', fontWeight: 600, lineHeight: 1.2, marginBottom: '4px' }}>
        {data.label}
      </div>

      {data.status === 'loading' && !data.description ? (
        <div style={{ padding: '8px 0', display: 'flex', alignItems: 'center', gap: '8px', opacity: 0.8 }}>
          <div className="wave-container">
            <span className="wave-bar"></span>
            <span className="wave-bar"></span>
            <span className="wave-bar"></span>
          </div>
          <span style={{ fontSize: '11px' }}>Thinking...</span>
        </div>
      ) : (
        data.description && (
          <div 
            className={data.status === 'loading' ? 'typing-cursor' : ''}
            style={{ 
              fontSize: '11px', 
              opacity: 0.8, 
              lineHeight: 1.4,
              maxHeight: '150px',
              overflowY: 'auto',
              scrollbarWidth: 'none',
              msOverflowStyle: 'none'
            }}
          >
            {data.description}
          </div>
        )
      )}
    </div>
  );
});
