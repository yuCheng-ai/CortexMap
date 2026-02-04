<p align="center">
  <img src="public/logo.svg" width="120" alt="CortexMap Logo">
</p>

# **CortexMap v0.2 — Product Specification**

[中文版 (Chinese Version)](./README_zh.md)

> **Native Memory & State Layer for AI Agents**
> — A readable, writable, rollable, and auditable structured "External Brain System."

---

## **1. Positioning**

**CortexMap** is a **Local-first** desktop application designed as the **standardized external brain infrastructure** for the AGI/Agent era. All data is stored in a local SQLite database, strictly avoiding forced SaaS models.

It provides a unified layer for all AI Agent frameworks:

* **Long-term Memory Layer**
* **Task State Layer**
* **Human-in-the-loop Visualization Layer**

CortexMap serves as both a **machine-readable API system** and a **human-editable visualization canvas**, acting as the **Single Source of Truth** for multi-agent collaboration.

Target users include:
* Quant & Financial Research teams
* Agent framework developers (LangGraph, AutoGPT, CrewAI, etc.)
* Enterprise AI automation teams
* Research-oriented AGI systems
* Hybrid RPA + AI systems

---

## **2. Strategic Blueprint: Universal Cognitive Topology**

The core essence of CortexMap is to build a **"Human-AI Symbiotic Structured Cognitive Operating System."** It is more than just a tool; it is a fundamental framework for "semantic alignment" between high-level human abstract thinking and distributed AI computing capabilities.

### **2.1 The Four Pillars of Cognition**
In CortexMap, mind map nodes are abstracted into four core dimensions, collectively forming a complete cognitive topology:
*   **Ontology**: Defines "What it is." Constructs knowledge graphs, value standards, and core conceptual systems of a domain.
*   **Logic**: Defines "How to do it." Captures algorithmic logic, decision trees, causal inference, and methodological paths.
*   **State**: Defines "Where we are." Records dynamic task progress, temporal evolution, narrative arcs, and execution traces.
*   **Evidence**: Defines "On what basis." Mounts underlying data, factual evidence, execution logs, and audit chains.

### **2.2 Decision Layer: Semantic Modeling & Value Alignment**
*   **Scenario**: Human leaders collaborate with Master AI to transform "non-standard intuition" into "standardized topology."
*   **Core Value**:
    *   **High-level Abstraction**: Humans define the ontology and logical boundaries, ensuring AI operates within the correct cognitive framework.
    *   **Structured Intervention**: Humans achieve "lossless correction" of AI's underlying cognitive logic by directly editing the topological structure.

### **2.3 Execution Layer: Distributed Cognition & Feedback**
*   **Scenario**: Multiple Worker AIs use the mind map as a "shared context" and "operational foundation."
*   **Core Value**:
    *   **Cognitive Decoupling**: Worker AIs don't need to understand the global intent; they execute local tasks based on the current node's semantics.
    *   **Automatic Filling & Evolution**: AI execution results are automatically transformed into new nodes or evidence, driving the self-iteration and refinement of the cognitive topology.

### **2.3 Core Link: Single Source of Truth**
The mind map serves as the **Single Source of Truth** for all participants (both humans and AI). It resolves issues like state synchronization, context overflow, and auditability in multi-agent collaboration.

---

## **3. Core Value Propositions**

CortexMap addresses three major industry pain points:

1. **Context Overload**
   * No more reliance on ultra-long prompts; Agents only load **relevant subtrees** on demand.
2. **Agent Amnesia (Lack of Persistence)**
   * Task states are stored long-term and can be reused across dialogues, sessions, and different Agents.
3. **AI Opacity (Black-box Behavior)**
   * Every step has a chain of evidence, allowing for rollback, reproduction, and traceability.

---

## **3. Key Features**

### **3.1 API-First: Context-on-Demand**
CortexMap provides granular subtree retrieval, ensuring Agents only receive the "memory slices" they need, preventing token overflow. Supports loading by task, topic, timeline, or dependency.

### **3.2 Git-like Incremental State (Batch Patch)**
Utilizes **Git-style state management**: every Agent execution is treated as an incremental patch. Supports `diff`, `merge`, `rollback`, and `snapshot`. This makes CortexMap the **"Git Repository for Agents."**

### **3.3 Evidence Mounting (Auditable AI)**
Each critical node can mount execution logs, screenshots, API responses, Commit IDs, and execution traces, forming a **complete audit chain**.

### **3.4 Control Tower UI (Human-in-the-loop)**
The visual UI acts as an **Agent Control Tower**, where humans can directly modify AI plans, insert task nodes, force rollbacks, or annotate paths, achieving true **Human-in-the-loop** collaboration.

---

## **4. Industry Use Case: Finance & Quant**

CortexMap's localized and versioned design is naturally suited for financial decision-making:

### **4.1 Investment Decision Audit**
Records all preconditions during Agent decision-making (e.g., real-time market data, research summaries, risk appetite). Provides **second-level backtracking** to restore the full context of a decision moment via the `commit` chain.

### **4.2 Quant Strategy State Management**
Uses **JSON Patch** to record intermediate states of complex quant strategies. Even if a strategy process crashes, it can recover instantly from the last Commit, enabling "breakpoint resume."

### **4.3 Privacy & Compliance**
Trading data and sensitive customer information remain entirely within the local SQLite database, meeting the stringent data privacy and compliance requirements of the financial industry.

---

## **5. Core Architecture**

CortexMap employs a "Trinity" localization architecture:

### **5.1 Components**
1.  **Desktop UI (Canvas)**: Built with **Tauri + React/Svelte**. Displays Agent memory topology and task states in real-time.
2.  **Embedded Local Server**: A lightweight **Rust HTTP Server** that starts with the desktop app (defaulting to `127.0.0.1:1357`).
3.  **Local Storage (SQLite)**: 
    *   **Features**: Supports ACID transactions, JSON1 extension, and Full-Text Search (FTS5).
    *   **Reliability**: **WAL (Write-Ahead Logging)** mode enabled by default for high-concurrency read/write operations.

### **5.2 Data Model (Git-like Schema)**
*   **`nodes`**: Stores the current snapshot of nodes.
*   **`edges`**: Stores relationships between nodes.
*   **`commits`**: Records metadata for every change.
*   **`patches`**: Stores incremental data in **RFC 6902 (JSON Patch)** format.
*   **`snapshots`**: Periodically stores full snapshots to accelerate loading.

---

## **6. Core Data Model (v0.2)**

```ts
interface CortexNode {
  id: string;
  text: string;
  role: 'plan' | 'execution' | 'memory' | 'evidence' | 'reflection';
  type: 'task' | 'knowledge' | 'evidence' | 'summary';
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  metadata: {
    run_id?: string;
    evidence_url?: string;
    raw_data_digest?: string;
    reasoning_trace?: string;   // Reasoning for AI choosing this node
  };
  children: string[];
}
```

---

## **7. Developer Integration**

### **7.1 Integration Flow**
1.  **Initialization**: Agent calls `GET /status` to check if local CortexMap is online.
2.  **Read Context**: Agent sends `POST /query` to retrieve the relevant "memory subtree."
3.  **Commit Changes**: Agent sends `POST /commit` with `patch` data to update the external brain.
4.  **Real-time Rendering**: Changes are pushed to the UI via the **Tauri Event Bridge**.

### **7.2 Python Integration Example**
```python
import requests

def commit_to_cortex(node_id, patch_data):
    url = "http://127.0.0.1:1357/v1/commit"
    payload = {
        "node_id": node_id,
        "patch": patch_data,
        "message": "Task step completed by Agent"
    }
    response = requests.post(url, json=payload)
    return response.json()
```

---

## **8. Roadmap (v0.2)**

*   **Week 1 — MVP Core**: Implement headless interfaces like `create_map`, `batch_patch`, `create_snapshot`.
*   **Week 2 — Versioning System**: Finalize `snapshot`, `diff`, `rollback`, and conflict detection; deliver Git-like engine.
*   **Week 3 — Closed-loop Integration**: Achieve two-way integration between Agent execution and CortexMap auto-updates.

---

## **9. Long-term Vision**

CortexMap aims to become:

> **The "External Brain OS" for the AGI Era.**

---

## **License**

This project is licensed under the [MIT License](./LICENSE).
