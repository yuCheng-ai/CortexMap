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
import { MindMapEdge } from './components/edges/MindMapEdge';
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
const nodeHeight = 80; // 调低计算高度，让 Dagre 排布更紧凑

const BRANCH_COLORS = [
  '#3b82f6', // blue
  '#10b981', // green
  '#8b5cf6', // purple
  '#f59e0b', // amber
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#f43f5e', // rose
  '#84cc16', // lime
];

const getLayoutedElements = <T extends Record<string, any>,>(nodes: Node<T>[], edges: Edge[]): { nodes: Node<T>[], edges: Edge[] } => {
  const rootNode = nodes.find(n => (n.data as any)?.is_root) || nodes[0];
  if (!rootNode) return { nodes, edges };

  // 1. 将节点分为左侧树和右侧树
  const rootChildren = edges.filter(e => e.source === rootNode.id).map(e => e.target);
  
  // 记录每个节点属于哪个分支、级别和颜色
  const nodeSideMap: Record<string, 'left' | 'right'> = {};
  const nodeLevelMap: Record<string, number> = {};
  const nodeColorMap: Record<string, string> = {};
  
  rootChildren.forEach((childId, index) => {
    // 左右交替分配根节点的直接子节点
    const side = index % 2 === 0 ? 'right' : 'left';
    const color = BRANCH_COLORS[index % BRANCH_COLORS.length];
    
    nodeSideMap[childId] = side;
    nodeLevelMap[childId] = 1;
    nodeColorMap[childId] = color;
    
    // 递归标记所有后代节点
    const queue = [{ id: childId, level: 1 }];
    while (queue.length > 0) {
      const { id: currentId, level } = queue.shift()!;
      const children = edges.filter(e => e.source === currentId).map(e => e.target);
      children.forEach(cid => {
        nodeSideMap[cid] = side;
        nodeLevelMap[cid] = level + 1;
        nodeColorMap[cid] = color;
        queue.push({ id: cid, level: level + 1 });
      });
    }
  });

  // 2. 创建两个独立的图进行布局
  const layoutSide = (sideNodes: string[]) => {
    const g = new dagre.graphlib.Graph();
    g.setGraph({ rankdir: 'LR', ranksep: 120, nodesep: 40 });
    g.setDefaultEdgeLabel(() => ({}));
    
    nodes.filter(n => sideNodes.includes(n.id)).forEach(n => {
      g.setNode(n.id, { width: nodeWidth, height: nodeHeight });
    });
    
    edges.filter(e => 
      (sideNodes.includes(e.source) && sideNodes.includes(e.target)) ||
      (e.source === rootNode.id && sideNodes.includes(e.target))
    ).forEach(e => {
      g.setEdge(e.source, e.target);
    });
    
    if (sideNodes.length > 0) {
      g.setNode(rootNode.id, { width: nodeWidth, height: nodeHeight });
    }
    
    dagre.layout(g);
    return g;
  };

  const leftNodeIds = Object.keys(nodeSideMap).filter(id => nodeSideMap[id] === 'left');
  const rightNodeIds = Object.keys(nodeSideMap).filter(id => nodeSideMap[id] === 'right');

  const leftGraph = layoutSide(leftNodeIds);
  const rightGraph = layoutSide(rightNodeIds);
  
  // 3. 合并布局结果，并注入级别和颜色信息
  const layoutedNodes = nodes.map(node => {
    if (node.id === rootNode.id) {
      return { 
        ...node, 
        position: { x: -nodeWidth / 2, y: -nodeHeight / 2 },
        data: { ...node.data, side: 'root' as const, level: 0, branchColor: '#94a3b8' }
      };
    }
    
    const side = nodeSideMap[node.id];
    const level = nodeLevelMap[node.id] || 0;
    const color = nodeColorMap[node.id] || '#94a3b8';

    const g = side === 'left' ? leftGraph : rightGraph;
    const pos = g.node(node.id);
    const rootPos = g.node(rootNode.id);
    
    if (!pos || !rootPos) return node;

    const relX = pos.x - rootPos.x;
    const relY = pos.y - rootPos.y;

    return {
      ...node,
      position: {
        x: side === 'left' ? -relX - nodeWidth / 2 : relX - nodeWidth / 2,
        y: relY - nodeHeight / 2
      },
      data: { ...node.data, side, level, branchColor: color }
    };
  });

  // 4. 为连线注入样式和正确的连接点
  const layoutedEdges = edges.map(edge => {
    // 统一从 nodeSideMap 获取侧向信息，确保逻辑一致性
    const isSourceRoot = edge.source === rootNode.id;
    const sourceSide = isSourceRoot ? 'root' : (nodeSideMap[edge.source] || 'right');
    const targetSide = nodeSideMap[edge.target] || 'right';
    const sourceLevel = nodeLevelMap[edge.source] || 0;
    const branchColor = nodeColorMap[edge.target] || '#94a3b8';
    
    // 自动选择连接点 ID
    let sourceHandle = 'right-out';
    let targetHandle = 'left-in';

    if (sourceSide === 'left') {
      sourceHandle = 'left-out';
    } else if (sourceSide === 'root' && targetSide === 'left') {
      sourceHandle = 'left-out';
    }

    if (targetSide === 'left') {
      targetHandle = 'right-in';
    }

    // 级别越浅，线越粗
    const strokeWidth = Math.max(1, 4 - sourceLevel);
    
    return {
      ...edge,
      type: 'mindmap',
      sourceHandle,
      targetHandle,
      style: {
        ...edge.style,
        stroke: branchColor,
        strokeWidth,
      },
      animated: false,
    };
  });

  return { nodes: layoutedNodes, edges: layoutedEdges };
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

  const onLayout = useCallback((currentNodes?: Node<CortexNodeData>[], currentEdges?: Edge[]) => {
    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
      currentNodes || nodes,
      currentEdges || edges
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

  const edgeTypes = useMemo(() => ({
    mindmap: MindMapEdge,
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

  // --- 节点交互操作 ---
  
  // 核心布局更新函数
  const performLayoutUpdate = useCallback((newNodes: Node<CortexNodeData>[], newEdges: Edge[]) => {
    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(newNodes, newEdges);
    setNodes(layoutedNodes);
    setEdges(layoutedEdges);
    apiClient.saveState(layoutedNodes, layoutedEdges);
  }, [setNodes, setEdges]);

  // 1. 手动添加子节点
  const handleAddChild = useCallback((parentId: string) => {
    const parentNode = nodes.find(n => n.id === parentId);
    if (!parentNode) return;

    const id = `manual-${Date.now()}`;
    const newNode: Node<CortexNodeData> = {
      id,
      type: 'cortex',
      position: { x: parentNode.position.x + 300, y: parentNode.position.y },
      data: { 
        label: '新子节点',
        type: 'logic',
        status: 'pending',
        description: '双击编辑内容'
      },
    };

    const newEdge: Edge = {
      id: `e-${parentId}-${id}`,
      source: parentId,
      target: id,
      type: 'mindmap'
    };

    performLayoutUpdate([...nodes, newNode], [...edges, newEdge]);
  }, [nodes, edges, performLayoutUpdate]);

  // 2. 删除节点及其子树
  const handleDeleteNode = useCallback((nodeId: string) => {
    if (nodeId === 'root') return; // 不允许删除根节点

    const getDescendants = (id: string, allEdges: Edge[]): string[] => {
      const children = allEdges.filter(e => e.source === id).map(e => e.target);
      let descendants = [...children];
      children.forEach(childId => {
        descendants = [...descendants, ...getDescendants(childId, allEdges)];
      });
      return descendants;
    };

    const toDelete = [nodeId, ...getDescendants(nodeId, edges)];
    const nextNodes = nodes.filter(n => !toDelete.includes(n.id));
    const nextEdges = edges.filter(e => !toDelete.includes(e.source) && !toDelete.includes(e.target));

    if (selectedNode?.id === nodeId) setSelectedNode(null);
    performLayoutUpdate(nextNodes, nextEdges);
  }, [nodes, edges, selectedNode, performLayoutUpdate]);

  // 3. 触发 AI 扩展特定节点
  const handleAIReasoning = useCallback(async (nodeId: string) => {
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
3. **多维拆解**：请根据目标节点的具体含义，灵活地从多个相关维度进行深度细化（例如原因、方案、风险、具体步骤、预期效果等）。

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

      // 构建包含完整历史记录的对话数组
      const history = chatMessages
        .filter(m => m.role !== 'system')
        .map(m => ({ role: m.role, content: m.content }));
      
      const messages = [
        ...history,
        { role: 'user', content: prompt }
      ];

      await ollamaClient.chat(selectedModel, messages as any, (chunk) => {
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
              let currentParentNode: Node<CortexNodeData> | undefined;

              const allCurrentNodes = [...nodes, ...streamNodes];
              currentParentNode = allCurrentNodes.find(n => n.id === parentId);
              if (!currentParentNode) {
                // 尝试按 Label 查找
                currentParentNode = allCurrentNodes.find(n => n.data.label === parentId || n.data.label.includes(parentId!));
                if (currentParentNode) parentId = currentParentNode.id;
                else parentId = nodeId; // 回退到目标节点
              }

              // 自动判断 side
              let nodeSide = nodeData.side;
              if (!nodeSide) {
                const pNode = allCurrentNodes.find(n => n.id === parentId);
                if (pNode) {
                  nodeSide = pNode.data.side === 'root' 
                    ? (streamNodes.filter(n => (n.data as any).parentId === pNode.id).length % 2 === 0 ? 'right' : 'left')
                    : pNode.data.side;
                }
              }

              const newNode: Node<CortexNodeData> = {
                id: newNodeId,
                type: 'cortex',
                position: { x: 0, y: 0 }, // 布局会自动处理
                data: {
                  label: nodeData.label,
                  type: nodeData.type || 'logic',
                  status: 'pending',
                  description: nodeData.description,
                  is_root: false,
                  side: nodeSide
                }
              };

              streamNodes.push(newNode);

              const newEdge: Edge = {
                id: `edge-${timestamp}-${i}`,
                source: parentId,
                target: newNodeId,
                type: 'mindmap',
                animated: true,
                style: { stroke: '#3b82f6', strokeWidth: 3 }
              };
              streamEdges.push(newEdge);

              processedTagsCount = nodeMatches.length;

              // 实时触发布局调整
              setNodes(prevNodes => {
                setEdges(prevEdges => {
                  const updatedNodes = [...prevNodes];
                  streamNodes.forEach(sn => {
                    if (!updatedNodes.some(un => un.id === sn.id)) updatedNodes.push(sn);
                  });

                  const updatedEdges = [...prevEdges];
                  streamEdges.forEach(se => {
                    if (!updatedEdges.some(ue => ue.id === se.id)) updatedEdges.push(se);
                  });

                  const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(updatedNodes, updatedEdges);
                  setTimeout(() => {
                    setNodes(layoutedNodes);
                    setEdges(layoutedEdges);
                  }, 0);
                  return prevEdges;
                });
                return prevNodes;
              });
            } catch (e) {
              console.error("Failed to parse streaming node JSON", e);
            }
          }
        }
      }, abortController.signal);

      // 生成结束后整理布局并保存
      setNodes(prevNodes => {
        setEdges(prevEdges => {
          const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(prevNodes, prevEdges);
          setNodes(layoutedNodes);
          setEdges(layoutedEdges);
          apiClient.saveState(layoutedNodes, layoutedEdges);
          return layoutedEdges;
        });
        return prevNodes;
      });

    } catch (error: any) {
      if (error.name === 'AbortError') {
        setChatMessages(msgs => msgs.map(m => 
          m.id === assistantId ? { ...m, content: m.content + '\n\n(已手动停止生成)' } : m
        ));
      } else {
        console.error('AI Reasoning failed:', error);
      }
    } finally {
      setIsReasoning(false);
      abortControllerRef.current = null;
    }
  }, [nodes, edges, chatMessages, selectedModel, setNodes, setEdges]);

  const handleAIExpand = useCallback((nodeId: string) => {
    const node = nodes.find(n => n.id === nodeId);
    if (node) {
      setSelectedNode(node);
      handleAIReasoning(nodeId);
    }
  }, [nodes, handleAIReasoning]);

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
      
      // 如果看起来像 XML 标签而非 JSON，尝试将其转换为简单的 JSON
      if (cleaned.startsWith('<') && cleaned.includes('>')) {
        const labelMatch = cleaned.match(/<label>([\s\S]*?)<\/label>/);
        const descMatch = cleaned.match(/<description>([\s\S]*?)<\/description>/);
        const parentMatch = cleaned.match(/<parent_id>([\s\S]*?)<\/parent_id>/);
        const typeMatch = cleaned.match(/<type>([\s\S]*?)<\/type>/);
        const isRootMatch = cleaned.match(/<is_root>([\s\S]*?)<\/is_root>/);

        if (labelMatch) {
          return {
            label: labelMatch[1].trim(),
            description: descMatch ? descMatch[1].trim() : '',
            parent_id: parentMatch ? parentMatch[1].trim() : null,
            type: typeMatch ? typeMatch[1].trim() : 'logic',
            is_root: isRootMatch ? isRootMatch[1].trim() === 'true' : false
          };
        }
      }

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

    // 提前定义 displayContent，避免 ReferenceError
    const displayContent = selectedNode 
      ? `针对节点 "${selectedNode.data.label}"：${content}`
      : content;

    const newUserMsg = { id: `user-${Date.now()}`, role: 'user' as const, content: displayContent };
    setChatInput('');
    setChatMessages(msgs => msgs.concat(newUserMsg));

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
      // 如果有选中节点，传递给上下文生成函数
      const context = generateAIContext(nodes, edges, selectedNode?.id);
      const timestamp = Date.now();
      const rootId = `root-${timestamp}`;
      
      const promptBase = selectedNode 
        ? `你是一个高级思维导图助手。请针对特定节点 "${selectedNode.data.label}" 进行深度扩展。

### 核心规则：
1. **无限层级生长**：不要局限于一级子节点。请根据逻辑需要，深入拆解出 2-3 层深度的子项。
2. **多节点连续输出**：一次性输出 5-10 个节点，构建一个局部的小树状结构。
3. **节点协议**：每个节点必须包裹在 <node> 和 </node> 之间，内部必须是合法的 JSON。
4. **父子关联**：利用 parent_id 将新生成的节点链接到 "${selectedNode.data.label}" 或你刚生成的其他新节点上。

### 目标扩展节点：
"${selectedNode.data.label}" (ID: ${selectedNode.id})

### 当前上下文：
${context}

### 用户指令：
"${content}"

### 输出格式示例：
[你的思考过程...]

<node>{"label": "子节点A", "description": "...", "parent_id": "${selectedNode.id}"}</node>
<node>{"label": "子节点A的子项1", "description": "...", "parent_id": "子节点A"}</node>
<node>{"label": "子节点A的子项2", "description": "...", "parent_id": "子节点A"}</node>`
        : `你是一个思维导图专家。请根据用户的问题进行全方位的深度拆解。

### 核心规则：
1. **深度拆解架构**：不要只输出扁平的一层节点。请构建一个包含根节点、一级分支、二级子项甚至三级细节的完整思维结构（总层级建议 3-4 层）。
2. **节点规模**：请一次性输出 8-15 个节点，确保逻辑链条完整。
3. **结构要求**：必须包含一个根节点（is_root: true），以及通过 parent_id 相互关联的层级节点。
4. **节点协议**：每个节点必须包裹在 <node> 和 </node> 之间，内部必须是合法的 JSON。

### 当前上下文：
${context}

### 用户请求：
"${content}"

### 输出格式示例：
[你的详细深度推理过程...]

<node>{"is_root": true, "label": "核心主题", "description": "..."}</node>
<node>{"label": "分支1", "description": "...", "parent_id": "root_current"}</node>
<node>{"label": "细节1.1", "description": "...", "parent_id": "分支1"}</node>
<node>{"label": "更深层细节1.1.1", "description": "...", "parent_id": "细节1.1"}</node>`;

      let fullResponse = '';
      let processedTagsCount = 0;
      const streamNodes: Node<CortexNodeData>[] = []; // 跟踪当前流中已创建的节点
      const streamEdges: Edge[] = []; // 跟踪当前流中已创建的连线
      
      // 初始化子节点计数，避免新生成的兄弟节点与现有节点重合
      const parentChildCounts: Record<string, number> = {};
      edges.forEach(edge => {
        parentChildCounts[edge.source] = (parentChildCounts[edge.source] || 0) + 1;
      });
      
      // 构建包含完整历史记录的对话数组
       const history = [
         ...chatMessages.filter(m => m.role !== 'system'),
         newUserMsg
       ].map(m => ({ role: m.role, content: m.content }));
       
       // 在最后一条用户消息中注入当前的思维导图上下文和指令协议
       // 我们只在最后一条消息中注入 context，因为它是最新的状态
       const messages = [
         ...history.slice(0, -1),
         { role: 'user', content: `${promptBase}\n\n请开始深度思考并生长节点：` }
       ];
      
      await ollamaClient.chat(selectedModel, messages as any, (chunk) => {
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

                // 紧凑的垂直分布算法 (适配 LR/RL)
                const isLeft = (childIndex % 2 !== 0); // 奇数为左侧
                const sideIndex = Math.floor(childIndex / 2); // 该侧的索引
                
                const horizontalSpacing = isLeft ? -380 : 380; // 左侧为负值
                const verticalSpacing = 100;   // 节点垂直间距 (兄弟)
                
                // 简单的从上往下堆叠
                const offsetY = (sideIndex * verticalSpacing) - 60;
                
                position = {
                  x: parentNode.position.x + horizontalSpacing,
                  y: parentNode.position.y + offsetY
                };
              }

              if (!isRoot && parentId) {
                // 自动判断 side
                let nodeSide = nodeData.side;
                if (!nodeSide && parentNode) {
                  nodeSide = parentNode.data.side === 'root' 
                    ? (streamNodes.filter(n => (n.data as any).parentId === parentNode.id).length % 2 === 0 ? 'right' : 'left')
                    : parentNode.data.side;
                }

                const newNode: Node<CortexNodeData> = {
                  id: nodeId,
                  type: 'cortex',
                  position,
                  data: {
                    label: isRoot ? `🚀 ${nodeData.label}` : nodeData.label,
                    type: nodeData.type || 'logic',
                    status: isRoot ? 'completed' : 'pending',
                    description: nodeData.description,
                    is_root: isRoot,
                    side: isRoot ? 'root' : nodeSide
                  }
                };

                streamNodes.push(newNode);
                setNodes(nds => {
                  if (nds.some(n => n.id === nodeId)) return nds;
                  return [...nds, newNode];
                });

                const newEdge: Edge = {
                  id: `edge-${timestamp}-${i}`,
                  source: parentId,
                  target: nodeId,
                  type: 'mindmap', // 使用自定义的思维导图连线
                  animated: true,
                  style: { stroke: '#3b82f6', strokeWidth: 3 }
                };
                streamEdges.push(newEdge);
                setEdges(eds => [...eds, newEdge]);
              } else if (isRoot) {
                // 处理根节点的情况
                const newNode: Node<CortexNodeData> = {
                  id: nodeId,
                  type: 'cortex',
                  position,
                  data: {
                    label: `🚀 ${nodeData.label}`,
                    type: nodeData.type || 'logic',
                    status: 'completed',
                    description: nodeData.description,
                    is_root: isRoot,
                    side: 'root'
                  }
                };
                streamNodes.push(newNode);
                setNodes(nds => {
                  if (nds.some(n => n.id === nodeId)) return nds;
                  return [...nds, newNode];
                });
              }

              processedTagsCount = nodeMatches.length;
              
              // 关键修复：使用函数式更新，确保拿到最准确的 nodes/edges
              setNodes(prevNodes => {
                setEdges(prevEdges => {
                  const updatedNodes = [...prevNodes];
                  // 只添加不在 prevNodes 中的新节点
                  streamNodes.forEach(sn => {
                    if (!updatedNodes.some(un => un.id === sn.id)) {
                      updatedNodes.push(sn);
                    }
                  });

                  const updatedEdges = [...prevEdges];
                  // 只添加不在 prevEdges 中的新连线
                  streamEdges.forEach(se => {
                    if (!updatedEdges.some(ue => ue.id === se.id)) {
                      updatedEdges.push(se);
                    }
                  });

                  // 实时触发布局调整
                  const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(updatedNodes, updatedEdges);
                  
                  // 异步更新，避免在 setEdges 内部调用 setNodes 导致的竞态
                  setTimeout(() => {
                    setNodes(layoutedNodes);
                    setEdges(layoutedEdges);
                  }, 0);
                  
                  return prevEdges; // 暂时返回原值，由 setTimeout 统一更新
                });
                return prevNodes;
              });
            } catch (e) {
              console.error("Failed to parse streaming node JSON", e);
            }
          }
        }
      }, abortController.signal);
      
      // 生成结束后自动整理布局
      setNodes(prevNodes => {
        setEdges(prevEdges => {
          const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(prevNodes, prevEdges);
          setNodes(layoutedNodes);
          setEdges(layoutedEdges);
          apiClient.saveState(layoutedNodes, layoutedEdges);
          return layoutedEdges;
        });
        return prevNodes;
      });
    } catch (error: any) {
      if (error.name === 'AbortError') {
        setChatMessages(msgs => msgs.map(m => 
          m.id === assistantId ? { ...m, content: m.content + '\n\n(已手动停止生成)' } : m
        ));
      } else {
        console.error('Chat reasoning failed:', error);
        setChatMessages(msgs => msgs.map(m => 
          m.id === assistantId ? { ...m, content: `推理失败: ${error.message || '未知错误'}。请检查 Ollama 是否启动或模型 "${selectedModel}" 是否已下载。` } : m
        ));
      }
    } finally {
      setIsReasoning(false);
      abortControllerRef.current = null;
    }
  }, [chatInput, chatMessages, viewMode, ollamaStatus, getChatSpawnPoint, nodes, edges, selectedModel, setNodes, setEdges, selectedNode]);

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

  // 为节点注入交互回调
  const nodesWithCallbacks = useMemo(() => {
    return nodes.map(node => ({
      ...node,
      data: {
        ...node.data,
        onAddChild: handleAddChild,
        onDelete: handleDeleteNode,
        onAIExpand: handleAIExpand,
      }
    }));
  }, [nodes, handleAddChild, handleDeleteNode, handleAIExpand]);

  return (
    <div style={{ width: '100vw', height: '100vh', backgroundColor: '#0f172a' }}>
      {/* Logo Header */}
      <div style={{ 
        position: 'absolute', 
        top: '20px', 
        left: '20px', 
        zIndex: 10,
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
        nodes={nodesWithCallbacks}
        edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
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
            onClick={() => onLayout()}
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
                {selectedNode && (
                  <div style={{
                    background: 'rgba(59, 130, 246, 0.1)',
                    border: '1px solid rgba(59, 130, 246, 0.3)',
                    borderRadius: '8px',
                    padding: '12px',
                    marginBottom: '8px',
                    fontSize: '12px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#60a5fa', fontWeight: 'bold', marginBottom: '4px' }}>
                      <Brain size={14} /> 当前选中节点
                    </div>
                    <div style={{ color: '#f1f5f9', fontWeight: 600, marginBottom: '2px' }}>{selectedNode.data.label}</div>
                    <div style={{ color: '#94a3b8', fontSize: '11px' }}>{selectedNode.data.description}</div>
                  </div>
                )}
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
          onExpand={handleAIExpand}
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
