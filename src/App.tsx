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
import { Plus, GitCommit, RefreshCw, Terminal, Copy, Brain, Cpu, GripHorizontal, LayoutDashboard } from 'lucide-react';
import { apiClient } from './api/client';
import { ollamaClient } from './api/ollama';
import { generateAIContext } from './utils/aiContext';
import Draggable from 'react-draggable';
import dagre from 'dagre';

const dagreGraph = new dagre.graphlib.Graph();
dagreGraph.setDefaultEdgeLabel(() => ({}));

const nodeWidth = 260; // 与 CortexNode.tsx 保持一致
const nodeHeight = 120; // 稍微调低，因为现在可以换行，垂直占用可能增加

const getLayoutedElements = <T extends Record<string, any>,>(nodes: Node<T>[], edges: Edge[], direction = 'LR'): { nodes: Node<T>[], edges: Edge[] } => {
  const isHorizontal = direction === 'LR';
  // ranksep 增加到 180，解决父子节点太近的问题
  // nodesep 减小到 80，使兄弟节点更紧凑
  dagreGraph.setGraph({ rankdir: direction, ranksep: 180, nodesep: 80 }); 

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    return {
      ...node,
      position: {
        x: nodeWithPosition.x - nodeWidth / 2,
        y: nodeWithPosition.y - nodeHeight / 2,
      },
    };
  });

  return { nodes: layoutedNodes, edges };
};

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
  const abortControllerRef = useRef<AbortController | null>(null);

  const stopReasoning = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsReasoning(false);
    }
  }, []);
  const [selectedModel, setSelectedModel] = useState(import.meta.env.VITE_OLLAMA_MODEL || 'llama3');
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<{ id: string; role: 'user' | 'assistant' | 'system'; content: string }[]>([
    { id: 'system-init', role: 'system', content: '输入目标或问题，AI 会生成思维节点。' }
  ]);
  const chatPanelRef = useRef<HTMLDivElement>(null);

  // Time Travel State
  const [viewMode, setViewMode] = useState<'live' | 'preview'>('live');
  const [liveState, setLiveState] = useState<{nodes: Node<CortexNodeData>[], edges: Edge[]} | null>(null);

  const onLayout = useCallback((direction = 'LR', currentNodes?: Node<CortexNodeData>[], currentEdges?: Edge[]) => {
    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
      currentNodes || nodes,
      currentEdges || edges,
      direction
    );

    setNodes([...layoutedNodes]);
    setEdges([...layoutedEdges]);
  }, [nodes, edges, setNodes, setEdges]);

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

  const parseNodeJSON = (str: string) => {
    try {
      // 1. 清理可能的 Markdown 代码块包裹
      let cleaned = str.replace(/```[a-z]*\n?/gi, '').replace(/```/g, '').trim();
      return JSON.parse(cleaned);
    } catch (e) {
      // 2. 如果还是失败，尝试简单的正则提取对象部分 {}
      try {
        const match = str.match(/\{[\s\S]*\}/);
        if (match) {
          return JSON.parse(match[0]);
        }
      } catch (innerE) {
        throw innerE;
      }
      throw e;
    }
  };

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
    setChatMessages(msgs => msgs.concat({ id: assistantId, role: 'assistant', content: '', rawContent: '' } as any));

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      const context = generateAIContext(nodes, edges);
      const timestamp = Date.now();
      const rootId = `root-${timestamp}`;
      const promptBase = `你是一个高级思维导图助手。请根据用户的问题进行深度拆解，并以“节点流式生长”的方式输出。

### 当前思维上下文：
${context}

### 用户请求：
"${content}"

### 核心任务：
1. **深度推理**：先在对话框中输出你的分析思路（不要包裹在任何标签内）。
2. **连续生长**：在分析过程中或分析后，连续输出多个 <node> 标签来构建导图。
3. **完整拆解**：不要只输出一个根节点。请针对用户的需求，至少拆解出“核心模块”、“数据流”、“技术栈”等关键维度的子节点。

### 输出协议（极其重要）：
- 每个节点必须包裹在 <node> 和 </node> 之间。
- **禁止**在标签内使用 \`\`\`json 或任何 Markdown 格式。
- 第一个节点必须是 \`is_root: true\`。
- 根节点创建后，后续所有直接挂载在它下面的子节点，其 \`parent_id\` 必须固定为 "root_current"。
- 你可以继续为子节点创建更深层的孙节点，此时 \`parent_id\` 为子节点的 \`label\` 或你预期的 ID。

### 示例序列：
<node>{"is_root": true, "label": "核心目标", "type": "plan", "description": "..."}</node>
<node>{"is_root": false, "label": "模块A", "parent_id": "root_current", "type": "logic", "description": "..."}</node>
<node>{"is_root": false, "label": "子任务1", "parent_id": "模块A", "type": "execution", "description": "..."}</node>

请立即开始：先分析，再连续生长出完整的思维树。`;

      let fullResponse = '';
      let processedTagsCount = 0;
      const streamNodes: Node<CortexNodeData>[] = []; // 跟踪当前流中已创建的节点
      const streamEdges: Edge[] = []; // 跟踪当前流中已创建的连线
      
      // 初始化子节点计数，避免新生成的兄弟节点与现有节点重合
      const parentChildCounts: Record<string, number> = {};
      edges.forEach(edge => {
        parentChildCounts[edge.source] = (parentChildCounts[edge.source] || 0) + 1;
      });
      
      await ollamaClient.chat(selectedModel, [{ role: 'user', content: `${promptBase}\n\n请开始思考并生长节点：` }], (chunk) => {
        fullResponse += chunk;
        
        // 实时更新聊天内容
        setChatMessages(msgs => msgs.map(m => {
          if (m.id === assistantId) {
            return { 
              ...m, 
              content: fullResponse,
              rawContent: fullResponse // Store raw content for "Copy Logs"
            } as any;
          }
          return m;
        }));

        // 尝试解析并提取生长出来的节点
        const nodeMatches = [...fullResponse.matchAll(/<node>([\s\S]*?)<\/node>/g)];
        if (nodeMatches.length > processedTagsCount) {
          for (let i = processedTagsCount; i < nodeMatches.length; i++) {
            try {
              const nodeData = parseNodeJSON(nodeMatches[i][1]);
              const isRoot = nodeData.is_root === true;
              const nodeId = isRoot ? rootId : `node-${timestamp}-${i}`;
              
              // 增强父节点 ID 解析逻辑
              let parentId = nodeData.parent_id;
              let parentNode: Node<CortexNodeData> | undefined;

              if (parentId === 'root_current') {
                parentId = rootId;
              }
              
              const allCurrentNodes = [...nodes, ...streamNodes];
              if (parentId) {
                parentNode = allCurrentNodes.find(n => n.id === parentId);
                if (!parentNode) {
                  // 尝试按 Label 查找
                  parentNode = allCurrentNodes.find(n => n.data.label === parentId || n.data.label.includes(parentId!));
                  if (parentNode) parentId = parentNode.id;
                }
              }

              // 自动布局逻辑 (LR 方向)
              let position = isRoot ? spawn : { x: spawn.x + 300, y: spawn.y };
              if (!isRoot && parentNode) {
                const childIndex = parentChildCounts[parentNode.id] || 0;
                parentChildCounts[parentNode.id] = childIndex + 1;

                // 紧凑的垂直分布算法 (适配 LR)
                const horizontalSpacing = 440; // 节点水平间距 (层级)
                const verticalSpacing = 140;   // 节点垂直间距 (兄弟)，调小以更紧凑
                
                // 简单的从上往下堆叠，初始稍微上移以对齐父节点
                const offsetY = (childIndex * verticalSpacing) - 100;
                
                position = {
                  x: parentNode.position.x + horizontalSpacing,
                  y: parentNode.position.y + offsetY
                };
              }

              const newNode: Node<CortexNodeData> = {
                id: nodeId,
                type: 'cortex',
                position,
                data: {
                  label: isRoot ? `🚀 ${nodeData.label}` : nodeData.label,
                  type: nodeData.type || 'logic',
                  status: isRoot ? 'completed' : 'pending',
                  description: nodeData.description
                }
              };

              streamNodes.push(newNode);
              setNodes(nds => {
                if (nds.some(n => n.id === nodeId)) return nds;
                return [...nds, newNode];
              });

              if (!isRoot && parentId) {
                const newEdge: Edge = {
                  id: `edge-${timestamp}-${i}`,
                  source: parentId,
                  target: nodeId,
                  label: '拆解',
                  animated: true,
                  style: { stroke: '#3b82f6', strokeWidth: 2 }
                };
                streamEdges.push(newEdge);
                setEdges(eds => [...eds, newEdge]);
              }

              // 实时触发布局调整，确保一边生成一边排版
              onLayout('LR', [...nodes, ...streamNodes], [...edges, ...streamEdges]);
            } catch (e) {
              console.error("Failed to parse streaming node JSON", e);
            }
          }
          processedTagsCount = nodeMatches.length;
        }
      }, abortController.signal);
      
      // 生成结束后自动整理布局，传入完整的节点和连线列表，避免消失
      onLayout('LR', [...nodes, ...streamNodes], [...edges, ...streamEdges]);
    } catch (error: any) {
      if (error.name === 'AbortError') {
        setChatMessages(msgs => msgs.map(m => 
          m.id === assistantId ? { ...m, content: m.content + '\n\n(已手动停止生成)' } : m
        ));
      } else {
        console.error('Chat reasoning failed:', error);
        setChatMessages(msgs => msgs.map(m => 
          m.id === assistantId ? { ...m, content: '推理失败，请检查 Ollama 状态或模型配置。' } : m
        ));
      }
    } finally {
      setIsReasoning(false);
      abortControllerRef.current = null;
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
      content: `正在针对节点 "${parentNode.data.label}" 进行深入推理...`,
      rawContent: ''
    } as any));

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      const timestamp = Date.now();
      const promptBase = `你是一个高级思维导图助手。请针对特定节点进行深度扩展，并以“节点流式生长”的方式输出。

### 当前思维上下文：
${context}

### 目标扩展节点：
"${parentNode.data.label}" (ID: ${nodeId})

### 核心任务：
1. **深度推理**：先在对话框中输出你对该节点的详细拆解思路（不要包裹在任何标签内）。
2. **连续生长**：输出多个 <node> 标签来扩展思维分支。
3. **多维拆解**：请从原因、方案、风险、预期结果等多个维度对目标节点进行细化。

### 输出协议（极其重要）：
- 每个节点必须包裹在 <node> 和 </node> 之间。
- **禁止**在标签内使用 \`\`\`json 或任何 Markdown 格式。
- 新生长节点的 \`parent_id\` 默认应为 "${nodeId}"。
- 如果你生长出了二级子节点，请使用一级子节点的 \`label\` 或你预期的 ID 作为 \`parent_id\`。

### 示例序列：
<node>{"label": "细化分支1", "parent_id": "${nodeId}", "type": "logic", "description": "..."}</node>
<node>{"label": "具体措施A", "parent_id": "细化分支1", "type": "execution", "description": "..."}</node>

请立即开始：先分析，再连续生长出深度拆解的子树。`;

      const promptOverride = parentNode.data.promptOverride?.trim();
      const prompt = promptOverride
        ? `${promptBase}\n\n用户补充指令：\n${promptOverride}\n\n请开始思考：`
        : `${promptBase}\n\n请开始思考：`;

      let fullResponse = '';
      let processedTagsCount = 0;
      const streamNodes: Node<CortexNodeData>[] = [];
      const streamEdges: Edge[] = [];
      
      // 初始化子节点计数，避免新生成的兄弟节点与现有节点重合
      const parentChildCounts: Record<string, number> = {};
      edges.forEach(edge => {
        parentChildCounts[edge.source] = (parentChildCounts[edge.source] || 0) + 1;
      });

      await ollamaClient.chat(selectedModel, [{ role: 'user', content: prompt }], (chunk) => {
        fullResponse += chunk;
        
        // 实时更新聊天内容
        setChatMessages(msgs => msgs.map(m => {
          if (m.id === assistantId) {
            return { 
              ...m, 
              content: fullResponse,
              rawContent: fullResponse
            } as any;
          }
          return m;
        }));

        // 尝试解析并提取生长出来的节点
        const nodeMatches = [...fullResponse.matchAll(/<node>([\s\S]*?)<\/node>/g)];
        if (nodeMatches.length > processedTagsCount) {
          for (let i = processedTagsCount; i < nodeMatches.length; i++) {
            try {
              const nodeData = parseNodeJSON(nodeMatches[i][1]);
              const newNodeId = `node-${timestamp}-${i}`;
              
              // 增强父节点 ID 解析逻辑
              let parentId = nodeData.parent_id || nodeId;
              let parentNodeObj: Node<CortexNodeData> | undefined;

              const allCurrentNodes = [...nodes, ...streamNodes];
              if (parentId) {
                parentNodeObj = allCurrentNodes.find(n => n.id === parentId);
                if (!parentNodeObj) {
                  // 尝试按 Label 查找
                  parentNodeObj = allCurrentNodes.find(n => n.data.label === parentId || n.data.label.includes(parentId!));
                  if (parentNodeObj) parentId = parentNodeObj.id;
                }
              }

              // 自动布局逻辑 (LR 方向)
              let position = { 
                x: parentNode.position.x + 350, 
                y: parentNode.position.y + (Math.random() * 200 - 100)
              };

              if (parentNodeObj) {
                const childIndex = parentChildCounts[parentNodeObj.id] || 0;
                parentChildCounts[parentNodeObj.id] = childIndex + 1;

                const horizontalSpacing = 440; // 层级间距
                const verticalSpacing = 140;   // 兄弟间距，调小以更紧凑
                
                // 简单的从上往下堆叠
                const offsetY = (childIndex * verticalSpacing) - 100;
                
                position = {
                  x: parentNodeObj.position.x + horizontalSpacing,
                  y: parentNodeObj.position.y + offsetY
                };
              }

              const newNode: Node<CortexNodeData> = { 
                id: newNodeId,
                type: 'cortex',
                position,
                data: {
                  label: nodeData.label,
                  type: nodeData.type || 'logic',
                  status: 'pending',
                  description: nodeData.description
                }
              };

              streamNodes.push(newNode);
              setNodes(nds => {
                if (nds.some(n => n.id === newNodeId)) return nds;
                return [...nds, newNode];
              });

              if (parentId) {
                const newEdge: Edge = {
                  id: `edge-${timestamp}-${i}`,
                  source: parentId,
                  target: newNodeId,
                  label: '拆解',
                  animated: true,
                  style: { stroke: '#94a3b8', strokeWidth: 2 }
                };
                streamEdges.push(newEdge);
                setEdges(eds => [...eds, newEdge]);
              }

              // 实时触发布局调整，确保一边生成一边排版
              onLayout('LR', [...nodes, ...streamNodes], [...edges, ...streamEdges]);
            } catch (e) {
              console.error("Failed to parse streaming node JSON in reasoning", e);
            }
          }
          processedTagsCount = nodeMatches.length;
        }
      }, abortController.signal);

      // 生成结束后自动整理布局，传入完整的节点和连线列表，避免消失
      onLayout('LR', [...nodes, ...streamNodes], [...edges, ...streamEdges]);
    } catch (error: any) {
      if (error.name === 'AbortError') {
        setChatMessages(msgs => msgs.map(m => 
          m.id === assistantId ? { ...m, content: m.content + '\n\n(已手动停止生成)' } : m
        ));
      } else {
        console.error('Reasoning failed:', error);
        setChatMessages(msgs => msgs.map(m => 
          m.id === assistantId ? { ...m, content: '推理失败，请重试。' } : m
        ));
      }
    } finally {
      setIsReasoning(false);
      abortControllerRef.current = null;
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
            onClick={() => onLayout('LR')}
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
            title="自动整理布局 (Left to Right)"
          >
            <LayoutDashboard size={14} style={{ color: '#3b82f6' }} />
            <span>自动布局</span>
          </button>

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
                  <div 
                    key={message.id} 
                    style={{ 
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
                      fontSize: message.role === 'assistant' ? '12px' : '13px',
                      position: 'relative'
                    }}
                  >
                    <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                            {message.content}
                          </div>
                    {(message as any).rawContent && (
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText((message as any).rawContent);
                          alert('已复制原始思考日志到剪贴板！');
                        }}
                        style={{
                          position: 'absolute',
                          right: '-24px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          background: 'transparent',
                          border: 'none',
                          color: '#64748b',
                          cursor: 'pointer',
                          padding: '4px',
                          opacity: 0.5,
                          transition: 'opacity 0.2s'
                        }}
                        title="复制原始日志"
                      >
                        <Copy size={12} />
                      </button>
                    )}
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
                <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
                  <textarea
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        if (!isReasoning) handleChatSend();
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
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {isReasoning ? (
                      <button
                        onClick={stopReasoning}
                        style={{
                          padding: '8px',
                          background: '#f43f5e',
                          border: 'none',
                          borderRadius: '8px',
                          color: 'white',
                          cursor: 'pointer',
                          fontSize: '12px',
                          fontWeight: 600,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        <Terminal size={14} /> 停止
                      </button>
                    ) : (
                      <button
                        onClick={handleChatSend}
                        disabled={!chatInput.trim() || ollamaStatus !== 'connected' || viewMode !== 'live'}
                        style={{
                          padding: '0 16px',
                          height: '36px',
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
                    )}
                  </div>
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
