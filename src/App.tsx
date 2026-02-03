import { useCallback } from 'react';
import { 
  ReactFlow,
  Background, 
  Controls, 
  useNodesState, 
  useEdgesState, 
  addEdge,
  Connection,
  Edge,
  Node
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

const initialNodes: Node[] = [
  { 
    id: '1', 
    position: { x: 250, y: 50 }, 
    data: { label: '🎯 Agent Goal: Quant Trading Strategy' },
    style: { background: '#3b82f6', color: '#fff', borderRadius: '8px', padding: '12px', width: 200 }
  },
  { 
    id: '2', 
    position: { x: 100, y: 150 }, 
    data: { label: '📚 Memory: Historical AAPL Data' },
    style: { background: '#10b981', color: '#fff', borderRadius: '8px', padding: '12px', width: 200 }
  },
  { 
    id: '3', 
    position: { x: 400, y: 150 }, 
    data: { label: '🔍 Evidence: News API Response' },
    style: { background: '#8b5cf6', color: '#fff', borderRadius: '8px', padding: '12px', width: 200 }
  },
  { 
    id: '4', 
    position: { x: 250, y: 300 }, 
    data: { label: '⚙️ Execution: Backtesting' },
    style: { background: '#f59e0b', color: '#fff', borderRadius: '8px', padding: '12px', width: 200 }
  },
];

const initialEdges: Edge[] = [
  { id: 'e1-4', source: '1', target: '4', animated: true, label: 'strategy' },
  { id: 'e2-4', source: '2', target: '4', label: 'context' },
  { id: 'e3-4', source: '3', target: '4', label: 'signals' },
];

function App() {
  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#0f172a' }}>
      <div style={{ 
        position: 'absolute', 
        top: 20, 
        left: 20, 
        zIndex: 10, 
        color: 'white',
        fontFamily: 'Inter, system-ui, sans-serif',
        pointerEvents: 'none'
      }}>
        <h1 style={{ margin: 0, fontSize: '24px', letterSpacing: '-0.025em' }}>CortexMap <span style={{ color: '#3b82f6' }}>v0.2</span></h1>
        <p style={{ opacity: 0.6, marginTop: '4px', fontSize: '14px' }}>Native Memory & State Layer for AI Agents</p>
      </div>

      <div style={{ 
        position: 'absolute', 
        bottom: 20, 
        right: 20, 
        zIndex: 10, 
        color: 'rgba(255,255,255,0.4)',
        fontSize: '12px'
      }}>
        Local-first Engine: Running on 127.0.0.1:1357
      </div>
      
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        fitView
      >
        <Background color="#1e293b" gap={25} size={1} />
        <Controls style={{ background: '#1e293b', border: '1px solid #334155', fill: '#fff' }} />
      </ReactFlow>
    </div>
  );
}

export default App;
