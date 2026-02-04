import { useEffect, useState } from 'react';
import { X, Clock, Hash, Activity, Sparkles } from 'lucide-react';
import { CortexNodeData } from '../nodes/CortexNode';

interface NodeInspectorProps {
  data: CortexNodeData | null;
  nodeId: string | null;
  onClose: () => void;
  onExpand?: (nodeId: string) => void;
  onUpdatePrompt?: (nodeId: string, prompt: string) => void;
}

export function NodeInspector({ data, nodeId, onClose, onExpand, onUpdatePrompt }: NodeInspectorProps) {
  if (!data || !nodeId) return null;

  const [promptOverride, setPromptOverride] = useState(data.promptOverride || '');

  useEffect(() => {
    setPromptOverride(data.promptOverride || '');
  }, [data.promptOverride, nodeId]);

  return (
    <div style={{
      position: 'absolute',
      top: 20,
      right: 20,
      width: '320px',
      backgroundColor: 'rgba(30, 41, 59, 0.95)',
      backdropFilter: 'blur(12px)',
      border: '1px solid #475569',
      borderRadius: '16px',
      color: 'white',
      zIndex: 20,
      boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      maxHeight: 'calc(100vh - 40px)',
      animation: 'slideIn 0.3s ease-out'
    }}>
      <style>{`
        @keyframes slideIn {
          from { transform: translateX(20px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>

      <div style={{
        padding: '16px',
        borderBottom: '1px solid #475569',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'rgba(15, 23, 42, 0.5)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Activity size={16} className="text-blue-400" />
          <span style={{ fontSize: '14px', fontWeight: 600, letterSpacing: '0.05em' }}>节点详情</span>
        </div>
        <button 
          onClick={onClose}
          style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}
        >
          <X size={18} />
        </button>
      </div>

      <div style={{ padding: '20px', overflowY: 'auto' }}>
        
        <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ 
            fontSize: '10px', 
            background: '#334155', 
            padding: '4px 8px', 
            borderRadius: '4px', 
            fontFamily: 'monospace',
            color: '#94a3b8'
          }}>
            ID: {nodeId}
          </span>
          <span style={{ 
            fontSize: '10px', 
            background: data.status === 'completed' ? '#059669' : '#d97706', 
            padding: '4px 8px', 
            borderRadius: '4px', 
            fontWeight: 600,
            textTransform: 'uppercase'
          }}>
            {data.status}
          </span>
        </div>

        <div style={{ marginBottom: '24px' }}>
          <label style={{ fontSize: '11px', textTransform: 'uppercase', color: '#94a3b8', fontWeight: 600, display: 'block', marginBottom: '8px' }}>
            思维向量 / 标签
          </label>
          <div style={{ fontSize: '16px', fontWeight: 600, lineHeight: 1.4 }}>
            {data.label}
          </div>
        </div>

        <div style={{ marginBottom: '24px' }}>
          <label style={{ fontSize: '11px', textTransform: 'uppercase', color: '#94a3b8', fontWeight: 600, display: 'block', marginBottom: '8px' }}>
            上下文与记忆
          </label>
          <div style={{ 
            background: '#0f172a', 
            padding: '12px', 
            borderRadius: '8px', 
            border: '1px solid #334155',
            fontSize: '13px',
            lineHeight: 1.6,
            color: '#cbd5e1',
            minHeight: '100px'
          }}>
            {data.description || "该节点暂无上下文数据。"}
          </div>
        </div>

        <div style={{ marginBottom: '24px' }}>
          <label style={{ fontSize: '11px', textTransform: 'uppercase', color: '#94a3b8', fontWeight: 600, display: 'block', marginBottom: '8px' }}>
            Prompt 编辑区
          </label>
          <textarea
            value={promptOverride}
            onChange={(e) => setPromptOverride(e.target.value)}
            placeholder="可在此补充该节点的推理偏好、上下文约束或格式要求"
            style={{
              width: '100%',
              minHeight: '120px',
              background: '#0f172a',
              border: '1px solid #334155',
              borderRadius: '8px',
              padding: '10px',
              fontSize: '12px',
              color: '#cbd5e1',
              resize: 'vertical',
              outline: 'none',
              boxSizing: 'border-box'
            }}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div style={{ background: '#1e293b', padding: '10px', borderRadius: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px', color: '#94a3b8' }}>
              <Clock size={12} />
              <span style={{ fontSize: '10px' }}>创建时间</span>
            </div>
            <div style={{ fontSize: '12px', fontWeight: 500 }}>刚刚</div>
          </div>
          <div style={{ background: '#1e293b', padding: '10px', borderRadius: '8px' }}>
             <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px', color: '#94a3b8' }}>
              <Hash size={12} />
              <span style={{ fontSize: '10px' }}>Token 消耗</span>
            </div>
            <div style={{ fontSize: '12px', fontWeight: 500 }}>~128</div>
          </div>
        </div>

      </div>

      <div style={{ padding: '16px', borderTop: '1px solid #475569', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <button 
          onClick={() => onExpand && onExpand(nodeId)}
          style={{
            padding: '10px',
            background: 'linear-gradient(90deg, #3b82f6, #8b5cf6)',
            border: 'none',
            borderRadius: '6px',
            color: 'white',
            fontSize: '12px',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px'
          }}
        >
          <Sparkles size={14} /> AI 联想 / 扩展思维
        </button>
        
        <div style={{ display: 'flex', gap: '8px' }}>
          <button style={{
            flex: 1,
            padding: '8px',
            background: '#334155',
            border: 'none',
            borderRadius: '6px',
            color: 'white',
            fontSize: '12px',
            fontWeight: 600,
            cursor: 'pointer'
          }}
          onClick={() => onUpdatePrompt && onUpdatePrompt(nodeId, promptOverride)}
          >
            保存 Prompt
          </button>
          <button style={{
            flex: 1,
            padding: '8px',
            background: '#334155',
            border: 'none',
            borderRadius: '6px',
            color: 'white',
            fontSize: '12px',
            fontWeight: 600,
            cursor: 'pointer'
          }}
          onClick={() => {
            setPromptOverride('');
            if (onUpdatePrompt) onUpdatePrompt(nodeId, '');
          }}
          >
            清空 Prompt
          </button>
        </div>
      </div>
    </div>
  );
}
