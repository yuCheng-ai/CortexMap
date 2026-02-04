# CortexMap 核心能力增强详细工作计划

本计划旨在通过参考 Thinking Map、Neurite 等优秀竞品，增强 CortexMap 的 AI 思考透明度、人类干预能力及本地化集成。

## 1. 现有架构分析与开发背景
CortexMap 采用 **Tauri + React + Rust** 架构，旨在创建一个完全隐私、本地运行的 Agent 思考空间。
- **前端逻辑核心**: [App.tsx](src/App.tsx) 负责 ReactFlow 的生命周期与 AI 推理调度。
- **内存协议**: [aiContext.ts](src/utils/aiContext.ts) 定义了如何将图形数据转化为 AI 能够理解的“系统上下文”。
- **版本控制**: [server.rs](src-tauri/src/server.rs) 提供了类似 Git 的 `Commit` 机制，用于保存思维快照。

---

## 2. 深度开发阶段分解

### 第一阶段：AI 实时推理与流式反馈 (实时性增强)
- **[A] 完善 Ollama 服务层**: 
  - 目标：确保 [ollama.ts](src/api/ollama.ts) 能够处理异常断连、超时，并支持多种模型。
  - 细节：增加 `listModels` 接口，在 UI 下拉框动态加载本地已有的模型。
- **[B] 流式渲染引擎 (Thinking Stream)**:
  - 目标：在 ReactFlow 节点内部实现高性能的文本流式渲染。
  - 细节：优化 `CortexNode.tsx`，在 `status === 'loading'` 时展示波浪进度条，并使用打字机效果更新描述。

### 第二阶段：人类干预与结构化任务拆解 (控制力增强)
- **[C] AI 结构化输出解析**:
  - 目标：AI 不仅仅是说话，而是能直接画图。
  - 细节：在 Prompt 中强制 AI 使用特定格式输出（如 `<brainstorm>...</brainstorm>` 标签包裹的 JSON），前端拦截该部分内容并自动调用 `addNode` 和 `addEdge`。
- **[D] 增强型 Node Inspector**:
  - 目标：让用户成为“思维的审阅者”。
  - 细节：在 [NodeInspector.tsx](src/components/ui/NodeInspector.tsx) 中增加 `Prompt 编辑区`，用户可以手动微调发送给 AI 的 Context。

### 第三阶段：多路径管理与版本回溯 (透明度增强)
- **[E] 思维分支管理 (Branching)**:
  - 目标：支持从任一 Commit 开启新的思维分支。
  - 细节：利用后端已有的 `parent_id` 机制，实现思维路径的 Fork 功能。
- **[F] 上下文自动修剪算法**:
  - 目标：防止思维图过大导致 Prompt 溢出。
  - 细节：在 [aiContext.ts](src/utils/aiContext.ts) 中引入权重算法，优先提取“最近活跃”和“直接关联”的节点。

---

## 3. 技术交接 Checklist
- [ ] 验证 [ollama.ts](src/api/ollama.ts) 的流式解析在不同模型（Llama3 vs Qwen2）下的兼容性。
- [ ] 在 `handleAIReasoning` 中实现 JSON 模式与自由对话模式的自动切换。
- [ ] 确保 Rust 后端 [server.rs](src-tauri/src/server.rs) 的状态保存接口能正确处理节点元数据（Position 等）。

---

## 4. 关键代码参考
- **AI 推理入口**: [App.tsx#L191](src/App.tsx)
- **上下文生成器**: [aiContext.ts](src/utils/aiContext.ts)
- **本地 AI 驱动**: [ollama.ts](src/api/ollama.ts)
