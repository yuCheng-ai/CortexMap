# CortexMap 技术交接与深度开发指南

本文件旨在为接手的 AI 助手提供完整的上下文，以便无缝继续 CortexMap 的核心能力增强开发。

## 1. 项目愿景与核心定位
CortexMap 不仅仅是一个思维导图工具，它是一个**本地优先的全维度认知操作系统与语义对齐层**。
- **核心定位**：AI 时代的“全维度认知拓扑（Universal Cognitive Topology）”。
- **使命：替代静态文档**：将企业的 BOM 信息、产品认知、业务规则从“死”的文档转化为“活”的拓扑节点，使其成为 AI 可实时读取并执行的“企业大脑”。
- **方法论：认知四维解构**：
    - **本体 (Ontology)**：定义核心概念与知识基座。
    - **逻辑 (Logic)**：定义决策规则与方法论路径。
    - **状态 (State)**：记录动态演进与执行轨迹。
    - **证据 (Evidence)**：挂载事实数据与审计链条。
- **战略模型**：
    - **决策层**：人 + Master AI 共同进行“语义建模”，将直觉转化为标准化的认知拓扑（Top-down）。
    - **执行层**：多 Worker AIs 将脑图作为“共享上下文”，进行局部任务执行并推动拓扑的自动演进（Bottom-up）。

## 2. 现有技术栈深度解析

### 2.1 前端：状态与可视化
- **核心入口**: [App.tsx](src/App.tsx)
  - 负责维护 `nodes` 和 `edges` 的 React 状态。
  - 集成了 [ollamaClient](src/api/ollama.ts) 负责本地 AI 通信。
- **节点协议**: [CortexNode.tsx](src/components/nodes/CortexNode.tsx)
  - 定义了 6 种核心角色：`plan` (目标), `memory` (记忆), `evidence` (证据), `execution` (执行), `logic` (逻辑), `reflection` (反思)。
- **Prompt 转换**: [aiContext.ts](src/utils/aiContext.ts)
  - **关键逻辑**：将非线性的图形结构（Nodes + Edges）序列化为带有语义标签的结构化 Markdown。这是 AI 理解当前“思维进度”的核心。

### 2.2 后端：持久化与版本控制
- **核心逻辑**: [server.rs](src-tauri/src/server.rs)
  - 使用 Axum 提供 REST API。
  - 核心接口 `/state` (当前状态) 和 `/commits` (历史快照)。
- **存储**: SQLite ([db.rs](src-tauri/src/db.rs))。

---

## 3. 已完成的初步工作 (Handover Points)
1. **本地 AI 集成**: 创建了 [ollama.ts](src/api/ollama.ts)，支持流式输出解析。
2. **推理原型**: 在 [App.tsx](src/App.tsx) 中实现了 `handleAIReasoning` 方法。
   - **逻辑流**：点击节点 -> 生成 Context -> 创建“思考中”节点 -> 调用 Ollama -> 流式更新节点描述 -> 结束推理。
3. **状态显示**: UI 底部 Panel 已支持显示后端 DB 和 Ollama 的连接状态。

---

## 4. 待解决的技术挑战与开发细节 (接手重点)

### 4.1 任务拆解与结构化输出 (High Priority)
- **挑战**：目前 `handleAIReasoning` 只是将 AI 输出填充到 description。
- **建议**：引导 AI 输出结构化 JSON。
- **实现路径**：
  - 修改 Prompt，强制要求 AI 按照 `{"nodes": [...], "edges": [...]}` 格式输出。
  - 在前端解析该 JSON，自动通过 `setNodes` 和 `setEdges` 扩展思维图。

### 4.2 流式 UI 体验优化
- **挑战**：ReactFlow 在频繁更新单个节点数据时可能存在性能抖动。
- **建议**：使用局部状态管理或更精细的 `useNodesState` 更新策略，确保打字机效果流畅。

### 4.3 侧边栏“人类干预”面板
- **需求**：参考 Thinking Map 的 `NodeInspector`。
- **实现路径**：
  - 增强 [NodeInspector.tsx](src/components/ui/NodeInspector.tsx)。
  - 允许用户手动修改 `status` 和 `label`。
  - 增加一个“重新推理”按钮，基于修改后的节点重新触发 `handleAIReasoning`。

### 4.4 本地上下文隔离 (Context Pruning)
- **需求**：当图很大时，全部 Context 会超出上下文窗口。
- **建议**：在 [aiContext.ts](src/utils/aiContext.ts) 中实现“子图提取算法”（例如只提取当前节点向上 2 层和向下 1 层的关联节点）。

## 5. 快速启动建议
1. 确保本地安装并运行了 [Ollama](https://ollama.ai/)。
2. 运行 `npm run tauri dev`。
3. 在 UI 左侧点击一个节点，选择“扩展/推理”，观察 [ollama.ts](src/api/ollama.ts) 的流式回调。

---
*交接人：Trae AI Assistant*
*日期：2026-02-04*
