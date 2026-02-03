import { Node, Edge } from '@xyflow/react';
import { CortexNodeData } from '../components/nodes/CortexNode';

/**
 * AI Context Protocol
 * Converts the visual graph into a structured narrative prompt that an LLM can understand.
 */

interface ProtocolSection {
  role: string;
  items: string[];
}

export const generateAIContext = (nodes: Node<CortexNodeData>[], edges: Edge[]): string => {
  const timestamp = new Date().toISOString();
  
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
