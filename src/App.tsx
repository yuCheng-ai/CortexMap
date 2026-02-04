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
import { Plus, GitCommit, RefreshCw, Terminal, Copy, Brain, Cpu } from 'lucide-react';
import { apiClient } from './api/client';
import { ollamaClient } from './api/ollama';
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
  const [isReasoning, setIsReasoning] = useState(false);
  const [ollamaStatus, setOllamaStatus] = useState<'connected' | 'offline'>('offline');
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [selectedModel, setSelectedModel] = useState(import.meta.env.VITE_OLLAMA_MODEL || 'llama3');

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
    // Check backend and ollama connection on mount
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
        const localData = await apiClient.getState();
        if (localData && localData.nodes.length > 0) {
          setNodes(localData.nodes);
          setEdges(localData.edges);
        }
      }

      const ollamaAlive = await ollamaClient.isAlive();
      setOllamaStatus(ollamaAlive ? 'connected' : 'offline');
      
      if (ollamaAlive) {
        const models = await ollamaClient.listModels();
        if (models.length > 0) {
          const modelNames = models.map(m => m.name);
          setAvailableModels(modelNames);
          
          // Priority: 
          // 1. Environment variable model (if valid)
          // 2. Currently selected model (if valid)
          // 3. First available model
          const envModel = import.meta.env.VITE_OLLAMA_MODEL;
          
          if (envModel && modelNames.some(m => m.includes(envModel))) {
             // If env model is found (even partial match), stick with it
             setSelectedModel(envModel);
          } else if (!modelNames.includes(selectedModel)) {
            // If current selection is invalid, pick the first one
            setSelectedModel(modelNames[0]);
          }
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

  const handleAIReasoning = async (nodeId: string) => {
    const parentNode = nodes.find(n => n.id === nodeId);
    if (!parentNode) return;

    setIsReasoning(true);
    // Pass nodeId to generate relevant context only (Pruning)
    const context = generateAIContext(nodes, edges, nodeId);
    const thinkingId = `thinking-${Date.now()}`;
    
    // Create a "Thinking" node
    const thinkingNode: Node<CortexNodeData> = {
      id: thinkingId,
      type: 'cortex',
      position: { 
        x: parentNode.position.x + 250, 
        y: parentNode.position.y 
      },
      data: { 
        label: '🤔 AI 正在思考...',
        type: 'reflection',
        status: 'loading',
        description: ''
      },
    };

    const thinkingEdge: Edge = {
      id: `e-${nodeId}-${thinkingId}`,
      source: nodeId,
      target: thinkingId,
      animated: true,
      label: '推理中'
    };

    setNodes(nds => nds.concat(thinkingNode));
    setEdges(eds => eds.concat(thinkingEdge));

    try {
      const prompt = `你是一个辅助思考的 Agent。当前系统的思维状态如下：
${context}

请针对节点 "${parentNode.data.label}" 进行深入推理。
你可以生成多个新的节点来扩展思维。

请按以下格式输出：
1. 首先进行自然语言的思考分析。
2. 然后，使用 JSON 格式定义要添加的新节点和连线，包裹在 <brainstorm> 标签中。

格式示例：
<brainstorm>
{
  "new_nodes": [
    { "label": "风险分析", "type": "logic", "description": "分析市场波动的潜在风险..." }
  ],
  "new_edges": [
    { "from": "parent_node_id", "to": "new_node_index_0", "label": "导致" }
  ]
}
</brainstorm>

注意：
- 节点 type 必须是: plan, memory, evidence, execution, logic, reflection 之一。
- new_edges 中的 "to" 字段可以使用 "new_node_index_X" 来引用 new_nodes 数组中的第 X 个节点（从 0 开始）。
- 当前节点 ID 为 "${parentNode.id}"。

请开始思考：`;

      let fullResponse = '';
      await ollamaClient.chat(selectedModel, [{ role: 'user', content: prompt }], (chunk) => {
        fullResponse += chunk;
        // Update thinking node description in real-time
        setNodes(nds => nds.map(n => 
          n.id === thinkingId 
            ? { ...n, data: { ...n.data, description: fullResponse } }
            : n
        ));
      });

      // Parse <brainstorm> block
      const brainstormMatch = fullResponse.match(/<brainstorm>([\s\S]*?)<\/brainstorm>/);
      let newNodesData: any[] = [];
      let newEdgesData: any[] = [];

      if (brainstormMatch) {
        try {
          const jsonStr = brainstormMatch[1];
          const parsed = JSON.parse(jsonStr);
          if (parsed.new_nodes) newNodesData = parsed.new_nodes;
          if (parsed.new_edges) newEdgesData = parsed.new_edges;
        } catch (e) {
          console.error("Failed to parse brainstorm JSON", e);
        }
      }

      const timestamp = Date.now();
      const createdNodes: Node<CortexNodeData>[] = newNodesData.map((n, index) => ({
        id: `node-${timestamp}-${index}`,
        type: 'cortex',
        position: { 
          x: parentNode.position.x + (Math.random() * 600 - 300), 
          y: parentNode.position.y + 300 + (Math.random() * 100)
        },
        data: {
          label: n.label,
          type: n.type || 'logic',
          status: 'pending',
          description: n.description
        }
      }));

      const createdEdges: Edge[] = newEdgesData.map((e, index) => {
        let source = e.from === 'parent_node_id' ? nodeId : e.from;
        let target = e.to;
        
        if (target.startsWith('new_node_index_')) {
          const idx = parseInt(target.split('_').pop() || '0');
          target = `node-${timestamp}-${idx}`;
        }
        
        return {
          id: `edge-${timestamp}-${index}`,
          source,
          target,
          label: e.label,
          animated: true,
          style: { stroke: '#94a3b8', strokeWidth: 2 }
        };
      });

      // After finished, finalize the node and add new ones
      setNodes(nds => {
        const updatedThinkingNode = nds.map(n => 
          n.id === thinkingId 
            ? { 
                ...n, 
                data: { 
                  ...n.data, 
                  label: '💡 AI 思考过程',
                  status: 'completed' as const
                } 
              }
            : n
        );
        return [...updatedThinkingNode, ...createdNodes];
      });

      if (createdEdges.length > 0) {
        setEdges(eds => [...eds, ...createdEdges]);
      }

    } catch (error) {
      console.error('Reasoning failed:', error);
      setNodes(nds => nds.map(n => 
        n.id === thinkingId 
          ? { ...n, data: { ...n.data, label: '❌ 推理失败', status: 'pending' } }
          : n
      ));
    } finally {
      setIsReasoning(false);
    }
  };

  const handleExpand = (nodeId: string) => {
    handleAIReasoning(nodeId);
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
              • Ollama: <span style={{ color: ollamaStatus === 'connected' ? '#10b981' : '#f43f5e' }}>
                {ollamaStatus === 'connected' ? '运行中' : '离线'}
              </span><br />
              • 活跃记忆节点: {nodes.filter(n => n.data?.type === 'memory').length}
            </div>

            <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #334155', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Brain size={14} style={{ color: '#a78bfa' }} />
              <select 
                value={selectedModel} 
                onChange={(e) => setSelectedModel(e.target.value)}
                style={{ 
                  background: 'transparent', 
                  border: 'none', 
                  color: '#cbd5e1', 
                  fontSize: '11px',
                  cursor: 'pointer',
                  outline: 'none',
                  flex: 1
                }}
              >
                {availableModels.length > 0 ? (
                  availableModels.map(model => (
                    <option key={model} value={model}>{model}</option>
                  ))
                ) : (
                  <option value="loading">Loading models...</option>
                )}
              </select>
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
