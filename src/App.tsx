import { useCallback, useMemo, useState, useEffect } from 'react';
import { 
  ReactFlow,
  Background, 
  Controls, 
  useNodesState, 
  useEdgesState, 
  addEdge,
  Connection,
  Edge,
  Node,
  Panel,
  NodeMouseHandler
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import './App.css';
import { CortexNode, CortexNodeData } from './components/nodes/CortexNode';
import { NodeInspector } from './components/ui/NodeInspector';
import { TimeTravelSlider } from './components/TimeTravelSlider';
import { CortexLogo } from './components/ui/CortexLogo';
import { Plus, GitCommit, RefreshCw, Terminal, Copy } from 'lucide-react';
import { apiClient } from './api/client';
import { generateAIContext } from './utils/aiContext';

const initialNodes: Node<CortexNodeData>[] = [
  { 
    id: '1', 
    type: 'cortex',
    position: { x: 250, y: 50 }, 
    data: { 
      label: '🎯 Agent 目标: 量化交易策略',
      type: 'logic',
      status: 'completed',
      description: '正在开发 AAPL/TSLA 配对的风险平价策略。目标是在保持 15% 年化收益的同时最小化回撤。'
    }
  },
  { 
    id: '2', 
    type: 'cortex',
    position: { x: 50, y: 200 }, 
    data: { 
      label: '📚 记忆: 历史数据',
      type: 'memory',
      status: 'completed',
      description: '从本地 SQLite 检索了 5 年的每日 OHLCV 数据。数据完整性验证：99.9% 完整。'
    }
  },
  { 
    id: '3', 
    type: 'cortex',
    position: { x: 450, y: 200 }, 
    data: { 
      label: '🔍 证据: 新闻 API',
      type: 'evidence',
      status: 'loading',
      description: '正在从 Bloomberg 和 Reuters 获取最新的情绪分析。正在分析前 50 条头条新闻的市场情绪。'
    }
  },
  { 
    id: '4', 
    type: 'cortex',
    position: { x: 250, y: 400 }, 
    data: { 
      label: '⚙️ 执行: 回测',
      type: 'execution',
      status: 'pending',
      description: '等待证据节点完成。一旦输入信号准备就绪，将运行 10,000 次迭代的蒙特卡洛模拟。'
    }
  },
];

const initialEdges: Edge[] = [
  { id: 'e1-4', source: '1', target: '4', animated: true, label: '策略流', style: { stroke: '#94a3b8', strokeWidth: 2 } },
  { id: 'e2-4', source: '2', target: '4', label: '上下文', style: { stroke: '#10b981', strokeWidth: 2 } },
  { id: 'e3-4', source: '3', target: '4', label: '信号', animated: true, style: { stroke: '#8b5cf6', strokeWidth: 2 } },
];

function App() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNode, setSelectedNode] = useState<Node<CortexNodeData> | null>(null);
  const [isCommitting, setIsCommitting] = useState(false);
  const [backendStatus, setBackendStatus] = useState<'connecting' | 'connected' | 'offline'>('connecting');

  // Time Travel State
  const [viewMode, setViewMode] = useState<'live' | 'preview'>('live');
  const [liveState, setLiveState] = useState<{nodes: Node<CortexNodeData>[], edges: Edge[]} | null>(null);

  // AI Context
  const handleCopyContext = useCallback(() => {
    const context = generateAIContext(nodes, edges);
    navigator.clipboard.writeText(context).then(() => {
      // Could add toast here
      console.log('Context copied to clipboard');
      alert('AI Context Copied to Clipboard!');
    });
  }, [nodes, edges]);

  useEffect(() => {
    // Check backend connection on mount
    const init = async () => {
      const isAlive = await apiClient.isBackendAlive();
      if (isAlive) {
        setBackendStatus('connected');
        const data = await apiClient.getState();
        if (data && data.nodes.length > 0) {
          setNodes(data.nodes);
          setEdges(data.edges);
        }
      } else {
        setBackendStatus('offline');
        // If offline, try to load from local cache
        const localData = await apiClient.getState();
        if (localData && localData.nodes.length > 0) {
          setNodes(localData.nodes);
          setEdges(localData.edges);
        }
      }
    };
    init();
  }, []);

  const nodeTypes = useMemo(() => ({
    cortex: CortexNode,
  }), []);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge({ ...params, animated: true }, eds)),
    [setEdges]
  );

  const handlePreviewState = useCallback((snapshotNodes: Node<CortexNodeData>[], snapshotEdges: Edge[]) => {
    if (viewMode === 'live') {
      setLiveState({ nodes, edges });
    }
    setNodes(snapshotNodes);
    setEdges(snapshotEdges);
    setViewMode('preview');
  }, [nodes, edges, viewMode, setNodes, setEdges]);

  const handleExitPreview = useCallback(() => {
    if (liveState) {
      setNodes(liveState.nodes);
      setEdges(liveState.edges);
    }
    setViewMode('live');
    setLiveState(null);
  }, [liveState, setNodes, setEdges]);

  const handleRestore = useCallback(async (commitId: string) => {
    await apiClient.restoreCommit(commitId);
    const newState = await apiClient.getState();
    if (newState) {
      setNodes(newState.nodes);
      setEdges(newState.edges);
    }
    setViewMode('live');
    setLiveState(null);
  }, [setNodes, setEdges]);

  const onNodeClick: NodeMouseHandler = useCallback((_, node) => {
    // Only allow selection in live mode or if we want to inspect in preview (read-only)
    // For now, let's allow inspection in both
    setSelectedNode(node as Node<CortexNodeData>);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
  }, []);

  const addNode = () => {
    const id = `${nodes.length + 1}`;
    const newNode: Node<CortexNodeData> = {
      id,
      type: 'cortex',
      position: { x: Math.random() * 400 + 100, y: Math.random() * 400 + 100 },
      data: { 
        label: `新想法 ${id}`,
        type: 'logic',
        status: 'pending',
        description: 'AI 生成的思维分支。等待上下文注入...'
      },
    };
    setNodes((nds) => nds.concat(newNode));
  };

  const handleExpand = (nodeId: string) => {
    // Mock AI Generation Logic
    const parentNode = nodes.find(n => n.id === nodeId);
    if (!parentNode) return;

    const newId = (nodes.length + 1).toString();
    const offset = Math.random() * 100 + 50;
    
    let newType: 'plan' | 'memory' | 'evidence' | 'execution' | 'logic' | 'reflection' = 'logic';
    let newLabel = 'AI 联想节点';
    let newDesc = 'AI 基于上下文生成的扩展思维。';

    // Simple heuristic for "AI" behavior
    if (parentNode.data.type === 'plan') {
      newType = 'execution';
      newLabel = '执行步骤';
      newDesc = '为了实现该目标，建议采取的具体行动。';
    } else if (parentNode.data.type === 'execution') {
      newType = 'evidence';
      newLabel = '执行结果/证据';
      newDesc = '执行该步骤后产生的观察结果。';
    } else if (parentNode.data.type === 'memory') {
      newType = 'reflection';
      newLabel = '记忆反思';
      newDesc = '对该段记忆的深度分析与洞察。';
    }

    const newNode: Node<CortexNodeData> = {
      id: newId,
      type: 'cortex',
      position: { 
        x: parentNode.position.x + offset, 
        y: parentNode.position.y + offset + 100 
      },
      data: { 
        label: newLabel,
        type: newType,
        status: 'pending',
        description: newDesc
      },
    };

    const newEdge: Edge = {
      id: `e${nodeId}-${newId}`,
      source: nodeId,
      target: newId,
      animated: true,
      label: 'AI 推演'
    };

    setNodes((nds) => nds.concat(newNode));
    setEdges((eds) => eds.concat(newEdge));
  };

  const handleCommit = async () => {
    setIsCommitting(true);
    
    // First check if backend is alive
    const isAlive = await apiClient.isBackendAlive();
    
    if (isAlive) {
      const success = await apiClient.saveState(nodes, edges);
      if (success) {
        setBackendStatus('connected');
        // Optional: show success toast
      } else {
        // Backend alive but save failed? 
        setBackendStatus('connected'); 
      }
    } else {
      setBackendStatus('offline');
      // Save to local storage as fallback
      localStorage.setItem('cortex_state', JSON.stringify({ nodes, edges }));
    }

    setTimeout(() => {
      setIsCommitting(false);
    }, 1000);
  };

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#0f172a' }}>
      <div style={{ 
        position: 'absolute', 
        top: 20, 
        left: 20, 
        zIndex: 10, 
        color: 'white',
        fontFamily: 'Inter, system-ui, sans-serif',
        pointerEvents: 'none',
        display: 'flex',
        alignItems: 'center',
        gap: '12px'
      }}>
        <CortexLogo size={40} variant="slanted-mobius" />
        <div>
          <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 800, letterSpacing: '-0.05em', lineHeight: 1 }}>
            CORTEX<span style={{ color: '#3b82f6' }}>MAP</span>
          </h1>
          <p style={{ opacity: 0.5, marginTop: '4px', fontSize: '12px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            Agent 原生状态层
          </p>
        </div>
      </div>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        fitView
        fitViewOptions={{ padding: 0.2, maxZoom: 1 }}
      >
        <Background color="#1e293b" gap={25} size={1} />
        <Controls style={{ background: '#1e293b', border: '1px solid #334155', fill: '#fff' }} />
        
        <Panel position="top-right" style={{ display: 'flex', gap: '8px' }}>
          <button 
            onClick={addNode}
            style={{
              padding: '8px 12px',
              backgroundColor: '#1e293b',
              border: '1px solid #334155',
              borderRadius: '8px',
              color: 'white',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '12px',
              fontWeight: 600,
              transition: 'all 0.2s'
            }}
          >
            <Plus size={14} /> 新建节点
          </button>
          <button 
            onClick={handleCommit}
            style={{
              padding: '8px 12px',
              backgroundColor: isCommitting ? '#10b981' : '#3b82f6',
              border: 'none',
              borderRadius: '8px',
              color: 'white',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '12px',
              fontWeight: 600,
              transition: 'all 0.3s',
              transform: isCommitting ? 'scale(0.95)' : 'scale(1)'
            }}
          >
            {isCommitting ? (
              <>
                <RefreshCw size={14} className="animate-spin" /> 提交中...
              </>
            ) : (
              <>
                <GitCommit size={14} /> 提交状态
              </>
            )}
          </button>
        </Panel>

        <Panel position="bottom-right" style={{ pointerEvents: 'none' }}>
           <div style={{ 
             width: '300px',
             height: '200px',
             background: 'rgba(15, 23, 42, 0.8)',
             backdropFilter: 'blur(4px)',
             border: '1px solid #334155',
             borderBottom: 'none',
             borderTopLeftRadius: '12px',
             borderTopRightRadius: '12px',
             overflow: 'hidden',
             display: 'flex',
             flexDirection: 'column',
             pointerEvents: 'auto'
           }}>
             <div style={{ 
               padding: '8px 12px', 
               background: '#1e293b', 
               borderBottom: '1px solid #334155',
               display: 'flex',
               alignItems: 'center',
               gap: '6px',
               fontSize: '11px',
               fontWeight: 600,
               color: '#94a3b8'
             }}>
               <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1 }}>
                 <Terminal size={12} /> AGENT 日志流
               </div>
               <button 
                 onClick={handleCopyContext}
                 title="Copy AI Context"
                 style={{ 
                   background: 'none', 
                   border: 'none', 
                   color: '#94a3b8', 
                   cursor: 'pointer',
                   padding: 0,
                   display: 'flex',
                   alignItems: 'center'
                 }}
               >
                 <Copy size={12} />
               </button>
             </div>
             <div style={{ 
               flex: 1, 
               padding: '12px', 
               fontFamily: 'monospace', 
               fontSize: '11px', 
               color: '#cbd5e1',
               overflowY: 'auto',
               display: 'flex',
               flexDirection: 'column',
               gap: '4px'
             }}>
               <span style={{ opacity: 0.5 }}>[10:42:01] 系统初始化完成.</span>
               <span style={{ color: '#60a5fa' }}>[10:42:02] 加载了 4 个活跃节点.</span>
               <span style={{ color: '#34d399' }}>[10:42:02] 已连接到 SQLite 数据库.</span>
               <span style={{ color: '#c084fc' }}>[10:42:05] 正在分析市场情绪...</span>
               <span style={{ opacity: 0.5 }}>[10:42:08] 等待用户输入...</span>
             </div>
           </div>
        </Panel>

        <Panel position="bottom-left">
          <div style={{ 
            padding: '12px', 
            backgroundColor: 'rgba(30, 41, 59, 0.8)', 
            backdropFilter: 'blur(8px)',
            border: '1px solid #334155', 
            borderRadius: '12px',
            color: 'white',
            fontSize: '11px',
            maxWidth: '240px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', color: '#3b82f6', fontWeight: 700 }}>
              <RefreshCw size={12} /> 系统状态
            </div>
            <div style={{ opacity: 0.8, lineHeight: 1.5 }}>
              • Rust 后端: <span style={{ color: backendStatus === 'connected' ? '#10b981' : backendStatus === 'connecting' ? '#f59e0b' : '#94a3b8' }}>
                {backendStatus === 'connected' ? '运行中' : backendStatus === 'connecting' ? '连接中...' : '离线 (本地模式)'}
              </span><br />
              • 数据存储: <span style={{ color: backendStatus === 'connected' ? '#10b981' : '#f59e0b' }}>
                {backendStatus === 'connected' ? 'SQLite (已连接)' : '浏览器缓存 (运行中)'}
              </span><br />
              • 活跃记忆节点: {nodes.filter(n => n.data?.type === 'memory').length}
            </div>

          </div>
        </Panel>

        <NodeInspector 
          data={selectedNode?.data || null} 
          nodeId={selectedNode?.id || null}
          onClose={() => setSelectedNode(null)} 
          onExpand={handleExpand}
        />
      </ReactFlow>
      
      <TimeTravelSlider 
        onPreviewState={handlePreviewState}
        onRestore={handleRestore}
        currentMode={viewMode}
        onExitPreview={handleExitPreview}
      />
    </div>
  );
}

export default App;
