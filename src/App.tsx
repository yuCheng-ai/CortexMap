import { useCallback, useMemo, useState, useEffect, useRef } from 'react';
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
import { Plus, GitCommit, RefreshCw, Terminal, Copy, Brain, Cpu, GripHorizontal } from 'lucide-react';
import { apiClient } from './api/client';
import { ollamaClient } from './api/ollama';
import { generateAIContext } from './utils/aiContext';
import Draggable from 'react-draggable';

const initialNodes: Node<CortexNodeData>[] = [];

const initialEdges: Edge[] = [];

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
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<{ id: string; role: 'user' | 'assistant' | 'system'; content: string }[]>([
    { id: 'system-init', role: 'system', content: '输入目标或问题，AI 会生成思维节点。' }
  ]);
  const chatPanelRef = useRef<HTMLDivElement>(null);

  // Time Travel State
  const [viewMode, setViewMode] = useState<'live' | 'preview'>('live');
  const [liveState, setLiveState] = useState<{nodes: Node<CortexNodeData>[], edges: Edge[]} | null>(null);
  const chatEndRef = useCallback((node: HTMLDivElement | null) => {
    if (node) {
      node.scrollIntoView({ behavior: 'smooth' });
    }
  }, []);

  // AI Context
  const handleCopyContext = useCallback(() => {
    const context = generateAIContext(nodes, edges);
    navigator.clipboard.writeText(context).then(() => {
      // Could add toast here
      console.log('Context copied to clipboard');
      alert('AI Context Copied to Clipboard!');
    });
  }, [nodes, edges]);

  const handleClearChat = useCallback(() => {
    setChatMessages([{ id: 'system-init', role: 'system', content: '输入目标或问题，AI 会生成思维节点。' }]);
  }, []);

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

  const handleUpdatePrompt = useCallback((nodeId: string, prompt: string) => {
    setNodes(nds => nds.map(n => 
      n.id === nodeId ? { ...n, data: { ...n.data, promptOverride: prompt } } : n
    ));
  }, [setNodes]);

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

  const getChatSpawnPoint = useCallback(() => {
    if (nodes.length === 0) return { x: 250, y: 200 };
    const average = nodes.reduce((acc, node) => ({
      x: acc.x + node.position.x,
      y: acc.y + node.position.y
    }), { x: 0, y: 0 });
    const center = { x: average.x / nodes.length, y: average.y / nodes.length };
    return { x: center.x + Math.random() * 120 - 60, y: center.y + Math.random() * 120 - 60 };
  }, [nodes]);

  const handleChatSend = useCallback(async () => {
    const content = chatInput.trim();
    if (!content) return;
    if (viewMode !== 'live') {
      setChatMessages(msgs => msgs.concat({ id: `system-${Date.now()}`, role: 'system', content: '当前处于预览模式，请先退出预览再发起对话。' }));
      return;
    }

    setChatInput('');
    setChatMessages(msgs => msgs.concat({ id: `user-${Date.now()}`, role: 'user', content }));

    if (ollamaStatus !== 'connected') {
      setChatMessages(msgs => msgs.concat({ id: `system-${Date.now()}`, role: 'system', content: 'Ollama 离线，无法生成节点。' }));
      return;
    }

    const spawn = getChatSpawnPoint();
    setIsReasoning(true);
    const assistantId = `assistant-${Date.now()}`;
    setChatMessages(msgs => msgs.concat({ id: assistantId, role: 'assistant', content: '' }));

    try {
      const context = generateAIContext(nodes, edges);
      const promptBase = `你是一个辅助思考的 Agent。当前系统的思维状态如下：
${context}

用户提出的新目标/问题为："${content}"。
请针对该目标进行深入推理并生成可执行的思维节点。

请按以下格式输出：
1. 首先进行自然语言的思考分析。
2. 然后，使用 JSON 格式定义要添加的新节点和连线，包裹在 <brainstorm> 标签中。

格式示例：
<brainstorm>
{
  "root_label": "Python 自动化工作流系统规划",
  "root_description": "构建一个集成爬虫、LLM 处理与飞书推送的端到端自动化系统。",
  "new_nodes": [
    { "label": "数据抓取模块", "type": "execution", "description": "负责从各技术媒体抓取资讯..." }
  ],
  "new_edges": [
    { "from": "parent_node_id", "to": "new_node_index_0", "label": "包含" }
  ]
}
</brainstorm>

注意：
- "root_label": 请为当前用户的目标生成一个极其简练、专业且具总结性的标题（不超过 15 个字），用于更新根节点。
- "root_description": 请为当前用户的目标生成一个专业的描述（不超过 50 个字），阐述其核心价值，用于更新根节点的描述。不要原封不动使用用户的原始指令。
- 节点 type 必须是: plan, memory, evidence, execution, logic, reflection 之一。
- new_edges 中的 "to" 字段可以使用 "new_node_index_X" 来引用 new_nodes 数组中的第 X 个节点（从 0 开始）。
- "parent_node_id" 是一个特殊的占位符，代表本次生成的根节点。请务必使用它作为起始连线的 "from"。
`;

      let fullResponse = '';
      await ollamaClient.chat(selectedModel, [{ role: 'user', content: `${promptBase}\n\n请开始思考：` }], (chunk) => {
        fullResponse += chunk;
        setChatMessages(msgs => msgs.map(m => 
          m.id === assistantId ? { ...m, content: m.content + chunk } : m
        ));
      });

      const brainstormMatch = fullResponse.match(/<brainstorm>([\s\S]*?)<\/brainstorm>/);
      let newNodesData: any[] = [];
      let newEdgesData: any[] = [];
      let rootLabel = '';
      let rootDescription = '';

      if (brainstormMatch) {
        try {
          const jsonStr = brainstormMatch[1];
          const parsed = JSON.parse(jsonStr);
          if (parsed.root_label) rootLabel = parsed.root_label;
          if (parsed.root_description) rootDescription = parsed.root_description;
          if (parsed.new_nodes) newNodesData = parsed.new_nodes;
          if (parsed.new_edges) newEdgesData = parsed.new_edges;
        } catch (e) {
          console.error("Failed to parse brainstorm JSON", e);
        }
      }

      const timestamp = Date.now();
      const parentId = `chat-${timestamp}`;
      
      // Create root node with AI generated content
      const parentNode: Node<CortexNodeData> = {
        id: parentId,
        type: 'cortex',
        position: spawn,
        data: {
          label: rootLabel ? `🚀 ${rootLabel}` : `🎯 目标解析`,
          type: 'plan',
          status: 'completed',
          description: rootDescription || content
        }
      };

      const createdNodes: Node<CortexNodeData>[] = newNodesData.map((n, index) => ({
        id: `node-${timestamp}-${index}`,
        type: 'cortex',
        position: {
          x: spawn.x + (Math.random() * 600 - 300), 
          y: spawn.y + 300 + (Math.random() * 100)
        },
        data: {
          label: n.label,
          type: n.type || 'logic',
          status: 'pending',
          description: n.description
        }
      }));

      let createdEdges: Edge[] = newEdgesData.map((e, index) => {
        let source = e.from === 'parent_node_id' ? parentId : e.from;
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

      if (createdEdges.length === 0 && createdNodes.length > 0) {
        createdEdges = createdNodes.map((node, index) => ({
          id: `edge-${timestamp}-auto-${index}`,
          source: parentId,
          target: node.id,
          label: '生成',
          animated: true,
          style: { stroke: '#94a3b8', strokeWidth: 2 }
        }));
      }
       
      // Add all nodes at once after reasoning
      setNodes(nds => [...nds, parentNode, ...createdNodes]);

      if (createdEdges.length > 0) {
        setEdges(eds => [...eds, ...createdEdges]);
      }
      
      const displayText = brainstormMatch ? fullResponse.replace(brainstormMatch[0], '').trim() : fullResponse;
      setChatMessages(msgs => msgs.map(m => 
        m.id === assistantId ? { ...m, content: displayText || m.content } : m
      ));
    } catch (error) {
      console.error('Chat reasoning failed:', error);
      setChatMessages(msgs => msgs.map(m => 
        m.id === assistantId ? { ...m, content: '推理失败，请检查 Ollama 状态或模型配置。' } : m
      ));
    } finally {
      setIsReasoning(false);
    }
  }, [chatInput, viewMode, ollamaStatus, getChatSpawnPoint, nodes, edges, selectedModel, setNodes, setEdges]);

  const handleAIReasoning = async (nodeId: string) => {
    const parentNode = nodes.find(n => n.id === nodeId);
    if (!parentNode) return;

    setIsReasoning(true);
    // Pass nodeId to generate relevant context only (Pruning)
    const context = generateAIContext(nodes, edges, nodeId);
    
    // Add an initial assistant message for reasoning
    const assistantId = `assistant-${Date.now()}`;
    setChatMessages(msgs => msgs.concat({ 
      id: assistantId, 
      role: 'assistant', 
      content: `正在针对节点 "${parentNode.data.label}" 进行深入推理...` 
    }));

    try {
      const promptBase = `你是一个辅助思考的 Agent。当前系统的思维状态如下：
${context}

请针对节点 "${parentNode.data.label}" 进行深入推理。
你可以生成多个新的节点来扩展思维。

请按以下格式输出：
1. 首先进行自然语言的思考分析。
2. 然后，使用 JSON 格式定义要添加的新节点 and 连线，包裹在 <brainstorm> 标签中。

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
- 当前节点 ID 为 "${parentNode.id}"。`;
      const promptOverride = parentNode.data.promptOverride?.trim();
      const prompt = promptOverride
        ? `${promptBase}\n\n用户补充指令：\n${promptOverride}\n\n请开始思考：`
        : `${promptBase}\n\n请开始思考：`;

      let fullResponse = '';
      await ollamaClient.chat(selectedModel, [{ role: 'user', content: prompt }], (chunk) => {
        fullResponse += chunk;
        // Update assistant message in real-time
        setChatMessages(msgs => msgs.map(m => 
          m.id === assistantId ? { ...m, content: fullResponse } : m
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

      // After finished, update chat with clean text and add nodes
      const displayText = brainstormMatch ? fullResponse.replace(brainstormMatch[0], '').trim() : fullResponse;
      setChatMessages(msgs => msgs.map(m => 
        m.id === assistantId ? { ...m, content: displayText || m.content } : m
      ));

      setNodes(nds => [...nds, ...createdNodes]);

      if (createdEdges.length > 0) {
        setEdges(eds => [...eds, ...createdEdges]);
      }

    } catch (error) {
      console.error('Reasoning failed:', error);
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
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#1e293b" gap={25} size={1} />
        
        <Panel position="top-right" style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '12px' }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px', 
            background: '#1e293b', 
            border: '1px solid #334155', 
            borderRadius: '8px',
            padding: '4px 12px',
            height: '34px'
          }}>
            <Brain size={14} style={{ color: '#a78bfa' }} />
            <select 
              value={selectedModel} 
              onChange={(e) => setSelectedModel(e.target.value)}
              style={{ 
                background: 'transparent', 
                border: 'none', 
                color: '#cbd5e1', 
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                outline: 'none',
                minWidth: '120px'
              }}
            >
              {availableModels.length > 0 ? (
                availableModels.map(model => (
                  <option key={model} value={model}>{model}</option>
                ))
              ) : (
                <option value="loading">Loading...</option>
              )}
            </select>
          </div>

          <div style={{ width: '1px', height: '24px', background: '#334155' }} />

          <Controls 
            showInteractive={false}
            style={{ 
              position: 'static', 
              margin: 0
            }} 
          />

          <div style={{ width: '1px', height: '24px', background: '#334155' }} />

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
              transition: 'all 0.2s',
              height: '34px'
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
              transform: isCommitting ? 'scale(0.95)' : 'scale(1)',
              height: '34px'
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

        <Panel position="bottom-right" style={{ pointerEvents: 'none', margin: '12px' }}>
          <Draggable nodeRef={chatPanelRef} handle=".chat-drag-handle">
            <div ref={chatPanelRef} style={{ 
              width: '400px',
              height: '450px',
              background: 'rgba(15, 23, 42, 0.9)',
              backdropFilter: 'blur(8px)',
              border: '1px solid #334155',
              borderRadius: '12px',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              pointerEvents: 'auto',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.2)'
            }}>
              <div 
                className="chat-drag-handle"
                style={{ 
                  padding: '10px 16px', 
                  background: '#1e293b', 
                  borderBottom: '1px solid #334155',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#f1f5f9',
                  cursor: 'grab'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                  <GripHorizontal size={14} style={{ color: '#64748b' }} />
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: ollamaStatus === 'connected' ? '#10b981' : '#ef4444' }} />
                  <Terminal size={14} /> AI 思考与对话
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button 
                    onClick={handleClearChat}
                    title="Clear Chat"
                    style={{ 
                      background: 'rgba(51, 65, 85, 0.5)', 
                      border: '1px solid #475569', 
                      color: '#94a3b8', 
                      cursor: 'pointer',
                      padding: '4px 8px',
                      borderRadius: '6px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '10px'
                    }}
                  >
                    <RefreshCw size={12} /> 清空
                  </button>
                  <button 
                    onClick={handleCopyContext}
                    title="Copy AI Context"
                    style={{ 
                      background: 'rgba(51, 65, 85, 0.5)', 
                      border: '1px solid #475569', 
                      color: '#94a3b8', 
                      cursor: 'pointer',
                      padding: '4px 8px',
                      borderRadius: '6px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '10px'
                    }}
                  >
                    <Copy size={12} /> 复制
                  </button>
                </div>
              </div>
              <div style={{ 
                flex: 1, 
                padding: '16px', 
                fontSize: '13px', 
                color: '#cbd5e1',
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                scrollBehavior: 'smooth'
              }}>
                {chatMessages.map(message => (
                  <div key={message.id} style={{ 
                    alignSelf: message.role === 'user' ? 'flex-end' : 'flex-start',
                    background: message.role === 'user' ? '#2563eb' : message.role === 'assistant' ? '#1e293b' : 'transparent',
                    color: message.role === 'system' ? '#94a3b8' : '#f8fafc',
                    border: message.role === 'assistant' ? '1px solid #334155' : 'none',
                    borderRadius: '12px',
                    padding: message.role === 'system' ? '0' : '10px 14px',
                    maxWidth: '90%',
                    lineHeight: 1.5,
                    whiteSpace: 'pre-wrap',
                    boxShadow: message.role === 'system' ? 'none' : '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                    fontSize: message.role === 'assistant' ? '12px' : '13px'
                  }}>
                    {message.content}
                  </div>
                ))}
                {isReasoning && (
                  <div style={{ display: 'flex', gap: '4px', padding: '4px' }}>
                    <span className="animate-bounce" style={{ width: '4px', height: '4px', background: '#94a3b8', borderRadius: '50%' }} />
                    <span className="animate-bounce" style={{ width: '4px', height: '4px', background: '#94a3b8', borderRadius: '50%', animationDelay: '0.2s' }} />
                    <span className="animate-bounce" style={{ width: '4px', height: '4px', background: '#94a3b8', borderRadius: '50%', animationDelay: '0.4s' }} />
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>
              <div style={{ 
                padding: '12px', 
                borderTop: '1px solid #334155',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                background: '#0f172a'
              }}>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <textarea
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleChatSend();
                      }
                    }}
                    placeholder="输入任务或问题..."
                    style={{
                      flex: 1,
                      height: '60px',
                      background: '#1e293b',
                      border: '1px solid #334155',
                      borderRadius: '8px',
                      padding: '10px',
                      fontSize: '13px',
                      color: '#f8fafc',
                      resize: 'none',
                      outline: 'none',
                      transition: 'border-color 0.2s',
                    }}
                    onFocus={(e) => e.currentTarget.style.borderColor = '#3b82f6'}
                    onBlur={(e) => e.currentTarget.style.borderColor = '#334155'}
                  />
                  <button
                    onClick={handleChatSend}
                    disabled={!chatInput.trim() || ollamaStatus !== 'connected' || viewMode !== 'live'}
                    style={{
                      padding: '0 16px',
                      background: chatInput.trim() && ollamaStatus === 'connected' && viewMode === 'live' ? '#2563eb' : '#334155',
                      border: 'none',
                      borderRadius: '8px',
                      color: 'white',
                      cursor: chatInput.trim() && ollamaStatus === 'connected' && viewMode === 'live' ? 'pointer' : 'not-allowed',
                      fontSize: '13px',
                      fontWeight: 600,
                      transition: 'background 0.2s',
                      opacity: chatInput.trim() && ollamaStatus === 'connected' && viewMode === 'live' ? 1 : 0.5
                    }}
                  >
                    发送
                  </button>
                </div>
                <div style={{ fontSize: '10px', color: '#64748b', textAlign: 'center' }}>
                  按 Enter 发送，Shift + Enter 换行
                </div>
              </div>
            </div>
          </Draggable>
        </Panel>

        <Panel position="bottom-left" style={{ margin: '0 0 10px 10px' }}>
          <div style={{ 
            padding: '10px 12px', 
            backgroundColor: 'rgba(15, 23, 42, 0.6)', 
            backdropFilter: 'blur(8px)',
            border: '1px solid #334155', 
            borderRadius: '10px',
            color: 'white',
            fontSize: '10px',
            width: '180px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px', color: '#94a3b8', fontWeight: 700, fontSize: '11px' }}>
              <Cpu size={12} /> 核心状态
            </div>
            <div style={{ opacity: 0.7, lineHeight: 1.6 }}>
              • 后端: <span style={{ color: backendStatus === 'connected' ? '#10b981' : '#f59e0b' }}>{backendStatus === 'connected' ? '在线' : '本地'}</span>
              <br />
              • 存储: <span style={{ color: backendStatus === 'connected' ? '#10b981' : '#f59e0b' }}>{backendStatus === 'connected' ? 'SQLite' : 'Cache'}</span>
              <br />
              • 模型: <span style={{ color: ollamaStatus === 'connected' ? '#10b981' : '#f43f5e' }}>{ollamaStatus === 'connected' ? 'Ollama OK' : 'Ollama 离线'}</span>
            </div>
          </div>
        </Panel>

        <NodeInspector 
          data={selectedNode?.data || null}
          nodeId={selectedNode?.id || null}
          onClose={() => setSelectedNode(null)}
          onExpand={handleExpand}
          onUpdatePrompt={handleUpdatePrompt}
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
