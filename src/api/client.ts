import { Node, Edge } from '@xyflow/react';
import { CortexNodeData } from '../components/nodes/CortexNode';

const API_BASE = 'http://127.0.0.1:1357';

export interface BackendNode {
  id: string;
  text: string;
  role: string;
  metadata: any;
  parent_id: string | null;
}

export interface BackendEdge {
  id: string;
  source: string;
  target: string;
  edge_type: string;
  metadata: any;
}

interface BackendState {
  nodes: BackendNode[];
  edges: BackendEdge[];
}

export interface Commit {
  id: string;
  message: string;
  timestamp: string;
  agent_id: string;
  parent_id: string | null;
}

function transformState(data: BackendState): { nodes: Node<CortexNodeData>[], edges: Edge[] } {
  const nodes: Node<CortexNodeData>[] = data.nodes.map(bn => ({
    id: bn.id,
    type: 'cortex',
    position: bn.metadata.position || { x: 0, y: 0 },
    data: {
      label: bn.text,
      status: (bn.role as any) || 'plan',
      description: bn.metadata.description || '',
      ...bn.metadata
    }
  }));

  const edges: Edge[] = data.edges.map(be => ({
    id: be.id,
    source: be.source,
    target: be.target,
    type: be.edge_type || 'default',
    animated: true,
    ...be.metadata
  }));

  return { nodes, edges };
}

export const apiClient = {
  async isBackendAlive(): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE}/health`, { method: 'GET' });
      return response.ok;
    } catch (e) {
      return false;
    }
  },

  async getState(): Promise<{ nodes: Node<CortexNodeData>[], edges: Edge[] } | null> {
    try {
      const response = await fetch(`${API_BASE}/state`);
      if (!response.ok) throw new Error('Failed to fetch state');
      const data: BackendState = await response.json();
      
      // If backend is connected but empty, return empty arrays instead of null
      if (!data.nodes) return { nodes: [], edges: [] };

      return transformState(data);
    } catch (e) {
      console.warn('Backend unreachable, using local state', e);
      const saved = localStorage.getItem('cortex_state');
      if (saved) {
        return JSON.parse(saved);
      }
      // Legacy fallback
      const oldSaved = localStorage.getItem('cortex_nodes');
      if (oldSaved) {
        return JSON.parse(oldSaved);
      }
      return null;
    }
  },

  async saveState(nodes: Node<CortexNodeData>[], edges: Edge[]): Promise<boolean> {
    try {
      const backendNodes: BackendNode[] = nodes.map(node => ({
        id: node.id,
        text: node.data.label,
        role: node.data.status || 'plan',
        metadata: {
          ...node.data,
          position: node.position
        },
        parent_id: null
      }));

      const backendEdges: BackendEdge[] = edges.map(edge => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        edge_type: edge.type || 'default',
        metadata: {
          ...edge
        }
      }));

      await fetch(`${API_BASE}/state`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nodes: backendNodes, edges: backendEdges })
      });

      // Also save to local storage for offline fallback
      localStorage.setItem('cortex_state', JSON.stringify({ nodes, edges }));
      return true;
    } catch (e) {
      console.warn('Backend unreachable, saving locally', e);
      localStorage.setItem('cortex_state', JSON.stringify({ nodes, edges }));
      return false;
    }
  },

  async getCommits(): Promise<Commit[]> {
    try {
      const response = await fetch(`${API_BASE}/commits`);
      if (!response.ok) throw new Error('Backend offline');
      return await response.json();
    } catch (e) {
      console.warn('Backend unreachable, returning mock commits');
      return [
        { id: 'mock-1', message: 'Initial System State', timestamp: new Date(Date.now() - 7200000).toISOString(), agent_id: 'system', parent_id: null },
        { id: 'mock-2', message: 'Imported Market Data', timestamp: new Date(Date.now() - 3600000).toISOString(), agent_id: 'user', parent_id: 'mock-1' },
        { id: 'mock-3', message: 'Generated Strategy Plan', timestamp: new Date(Date.now() - 1800000).toISOString(), agent_id: 'ai-agent', parent_id: 'mock-2' },
        { id: 'mock-4', message: 'Execution & Monitoring', timestamp: new Date().toISOString(), agent_id: 'user', parent_id: 'mock-3' }
      ];
    }
  },

  async createCommit(message: string, agentId: string = 'user') {
    try {
      await fetch(`${API_BASE}/commits`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, agent_id: agentId })
      });
    } catch (e) {
      console.error('Failed to create commit', e);
    }
  },

  async getCommitSnapshot(commitId: string): Promise<{ nodes: Node<CortexNodeData>[], edges: Edge[] } | null> {
    try {
      if (commitId.startsWith('mock-')) {
        // Return local state for mock commits to ensure preview works (or we could generate variations)
        const saved = localStorage.getItem('cortex_state');
        if (saved) return JSON.parse(saved);
        // Fallback to legacy
        const oldSaved = localStorage.getItem('cortex_nodes');
        if (oldSaved) return { nodes: JSON.parse(oldSaved), edges: [] };
        return null;
      }
      const response = await fetch(`${API_BASE}/commits/${commitId}/snapshot`);
      if (!response.ok) return null;
      const data: BackendState = await response.json();
      return transformState(data);
    } catch (e) {
      return null;
    }
  },

  async restoreCommit(commitId: string) {
    try {
        await fetch(`${API_BASE}/commits/${commitId}/restore`, {
            method: 'POST'
        });
    } catch (e) {
        console.error('Failed to restore commit', e);
    }
  }
};
