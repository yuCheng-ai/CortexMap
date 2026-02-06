import { Node, Edge } from '@xyflow/react';
import { CortexNodeData } from '../components/nodes/CortexNode';

/**
 * AI Context Protocol
 * Converts the visual graph into a structured narrative prompt that an LLM can understand.
 */

/* interface ProtocolSection {
  role: string;
  items: string[];
} */

export const generateAIContext = (
  allNodes: Node<CortexNodeData>[], 
  edges: Edge[],
  focusNodeId?: string
): string => {
  const timestamp = new Date().toISOString();
  
  // Context Pruning Logic
  let nodes = allNodes;
  
  if (focusNodeId) {
    const focusNode = allNodes.find(n => n.id === focusNodeId);
    if (focusNode) {
      // Always include global plans
      // const planNodes = allNodes.filter(n => n.data.type === 'plan');
      
      // Find 1-hop neighbors
      const connectedEdgeIds = new Set<string>();
      const neighborIds = new Set<string>();
      neighborIds.add(focusNodeId);

      edges.forEach(edge => {
        if (edge.source === focusNodeId) {
          neighborIds.add(edge.target);
          connectedEdgeIds.add(edge.id);
        }
        if (edge.target === focusNodeId) {
          neighborIds.add(edge.source);
          connectedEdgeIds.add(edge.id);
        }
      });

      // Find 2-hop upstream (ancestors) for context
      const ancestorsIds = new Set<string>();
      edges.forEach(edge => {
        if (neighborIds.has(edge.target) && !neighborIds.has(edge.source)) {
             // If target is a neighbor (or focus), source is an ancestor
             ancestorsIds.add(edge.source);
        }
      });
      
      const relevantIds = new Set([...neighborIds, ...ancestorsIds]);
      
      // Filter nodes: Plans + Relevant (Focus/Neighbors/Ancestors)
      nodes = allNodes.filter(n => 
        n.data.type === 'plan' || relevantIds.has(n.id)
      );
    }
  }

  // Group nodes by role
  const groups: Record<string, Node<CortexNodeData>[]> = {
    plan: [],
    memory: [],
    evidence: [],
    execution: [],
    logic: [],
    reflection: []
  };

  nodes.forEach(node => {
    const role = node.data.type || 'logic';
    if (groups[role]) {
      groups[role].push(node);
    } else {
      groups['logic'].push(node); // Fallback
    }
  });

  // Build the narrative
  let context = `# Cortex System Context [${timestamp}]\n\n`;
  context += `> System Status: Active\n`;
  context += `> Active Nodes: ${nodes.length}\n`;
  context += `> Knowledge Connections: ${edges.length}\n\n`;

  // 0. Current Node State (Structural Context)
  context += `## 🏗️ Current Mind Map Structure\n`;
  context += `以下是当前已存在的思维导图节点，请在生成新节点时参考它们的 ID 和层级关系：\n\n`;
  nodes.forEach(node => {
    const parentEdge = edges.find(e => e.target === node.id);
    const nodeState = {
      id: node.id,
      label: node.data.label,
      type: node.data.type,
      parent_id: parentEdge ? parentEdge.source : (node.data.is_root ? null : 'root'),
      description: node.data.description,
      is_root: node.data.is_root || false
    };
    context += `<node>${JSON.stringify(nodeState)}</node>\n`;
  });
  context += `\n`;

  // 1. Primary Goals (Plans)
  if (groups.plan.length > 0) {
    context += `## 🎯 Current Objectives (Plans)\n`;
    groups.plan.forEach(node => {
      context += `- **${node.data.label}** (${node.data.status})\n`;
      context += `  ${node.data.description}\n`;
      // Find connected executions
      const relatedEdges = edges.filter(e => e.source === node.id);
      if (relatedEdges.length > 0) {
        context += `  -> Triggers: ${relatedEdges.map(e => {
            const target = nodes.find(n => n.id === e.target);
            return target ? target.data.label : 'Unknown';
        }).join(', ')}\n`;
      }
      context += `\n`;
    });
  }

  // 2. Active Context (Memory & Evidence)
  if (groups.memory.length > 0 || groups.evidence.length > 0) {
    context += `## 🧠 Active Context\n`;
    
    if (groups.memory.length > 0) {
        context += `### Working Memory\n`;
        groups.memory.forEach(node => {
            context += `- [Memory] ${node.data.label}: ${node.data.description}\n`;
        });
    }

    if (groups.evidence.length > 0) {
        context += `### External Evidence\n`;
        groups.evidence.forEach(node => {
            context += `- [Evidence] ${node.data.label} (${node.data.status}): ${node.data.description}\n`;
        });
    }
    context += `\n`;
  }

  // 3. Execution Stream
  if (groups.execution.length > 0 || groups.logic.length > 0) {
    context += `## ⚙️ Execution Logic\n`;
    [...groups.execution, ...groups.logic].forEach(node => {
      context += `- ${node.data.label}\n`;
      if (node.data.description) context += `  Description: ${node.data.description}\n`;
      
      // Trace dependencies (Incoming edges)
      const incoming = edges.filter(e => e.target === node.id);
      if (incoming.length > 0) {
          const sources = incoming.map(e => {
              const src = nodes.find(n => n.id === e.source);
              return src ? src.data.label : 'Unknown';
          });
          context += `  Dependencies: ${sources.join(', ')}\n`;
      }
    });
    context += `\n`;
  }

  // 4. Reflections
  if (groups.reflection.length > 0) {
    context += `## 💡 Reflections & Insights\n`;
    groups.reflection.forEach(node => {
      context += `- ${node.data.label}: ${node.data.description}\n`;
    });
  }

  return context;
};
