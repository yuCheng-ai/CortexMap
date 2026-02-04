<p align="center">
  <img src="public/logo.svg" width="120" alt="CortexMap Logo">
</p>

# **CortexMap v0.2 — 产品规范**

> **Agent 原生记忆与状态层（Native Memory & State Layer for AI Agents）**
> —— 可读写、可回滚、可审计、可协作的结构化“外脑系统”。

---

## **1. 产品定位**

**CortexMap** 是一款**本地优先（Local-first）**的桌面端应用，定位为 AGI/Agent 时代的**标准化外部大脑基础设施**。所有数据均存储在用户本地 SQLite 数据库中，坚决不强制 SaaS 化。

它为所有 AI Agent 框架提供统一的：

* **长期记忆层（Memory Layer）**
* **任务状态层（State Layer）**
* **可视化协同层（Human-in-the-loop Layer）**

CortexMap 既是**机器可读写的 API 系统**，也是**人类可编辑的可视化画布**，作为多 Agent 协作的 **Single Source of Truth（单一事实源）**。

目标用户包括：

* 量化交易与金融研究团队 (Quant & Finance)
* Agent 框架开发者（LangGraph、AutoGPT、CrewAI 等）
* 企业 AI 自动化团队
* 研究型 AGI 系统
* RPA + AI 混合系统

---

## **2. 战略蓝图：全维度认知拓扑（Universal Cognitive Topology）**

CortexMap 的核心本质是构建一个**“人机共生的结构化认知操作系统”**。它不仅仅是一个工具，而是一个将人类的高阶抽象思维与 AI 的分布式计算能力进行“语义对齐”的底层框架。

### **2.1 认知的四维解构 (The Four Pillars of Cognition)**
在 CortexMap 中，脑图节点被抽象为以下四个核心维度，共同构成完整的认知拓扑：
*   **本体 (Ontology)**：定义“是什么”。构建领域的知识图谱、价值标准和核心概念体系。
*   **逻辑 (Logic)**：定义“怎么做”。沉淀算法逻辑、决策决策树、因果推演和方法论路径。
*   **状态 (State)**：定义“到哪了”。记录动态的任务进度、时空演进、叙事脉络和执行轨迹。
*   **证据 (Evidence)**：定义“凭什么”。挂载底层数据、事实证据、运行日志和审计链条。

### **2.2 决策层：语义建模与价值对齐 (Semantic Modeling)**
*   **场景**：人类领导者与 Master AI 协作，完成从“非标直觉”到“标准化拓扑”的转化。
*   **核心价值**：
    *   **高阶抽象**：人类负责定义本体和逻辑边界，确保 AI 在正确的认知框架内运行。
    *   **结构化干预**：人类通过直接编辑拓扑结构，实现对 AI 底层认知逻辑的“无损修正”。

### **2.3 执行层：分布式认知与反馈 (Distributed Cognition)**
*   **场景**：多个 Worker AIs 将脑图作为“共享上下文”和“作业基座”。
*   **核心价值**：
    *   **认知解耦**：Worker AI 无需理解全局意图，只需基于当前节点的语义执行局部任务。
    *   **自动填充与演进**：AI 执行的结果会自动转化为新的节点或证据，推动认知拓扑的自我迭代与完善。

### **2.3 核心纽带：Single Source of Truth**
脑图是所有参与者（人与 AI）的**单一事实源**。它解决了多 Agent 协作中的状态同步、上下文溢出和不可审计问题。

---

## **3. 核心价值主张：为什么是“拓扑”而非“文档”？**

CortexMap 解决的不仅仅是 AI 的记忆问题，更是企业知识管理的一次范式转移：**从“静态文档”进化为“活体拓扑”**。

### **3.1 替代传统文档 (Documentation Replacement)**
在制造业等复杂领域（如 BOM 管理、订单处理），传统的 PDF 或 Wiki 文档是“死”的：
*   **不可感知**：AI 很难从 500 页的手册中精准定位到当前的业务约束。
*   **版本割裂**：文档更新永远赶不上业务变化。
*   **非结构化**：文档无法直接驱动 Agent 的行为逻辑。

**CortexMap 的优势**：将企业的 BOM 信息、产品规范、工艺流程全部“拓扑化”。AI Agent 不再是读文档，而是直接在**“活着的企业大脑”**中游走，实时获取最新的语义节点。

### **3.2 上下文爆炸（Context Overload）**
不再依赖超长 Prompt，Agent 只按需加载**相关子树**。
2. **Agent 失忆（Lack of Persistence）**
   * 任务状态可长期存储，可跨对话、跨会话、跨 Agent 复用。
3. **AI 不可审计（Black-box Behavior）**
   * 每一步都有证据链，可回滚、可复现、可追溯。

---

## **3. 产品核心特性**

### **3.1 API-First：按需上下文**
CortexMap 提供精细化子树检索，Agent 只获取“需要的记忆切片”，避免 token 溢出。支持按任务、主题、时间线或依赖关系加载。

### **3.2 Git-like 增量状态（Batch Patch）**
采用 **Git 风格状态管理**：每次 Agent 执行即为一次增量 patch。支持 `diff`、`merge`、`rollback` 和 `snapshot`。这使 CortexMap 成为 **“Agent 的 Git 仓库”**。

### **3.3 证据挂载（Auditable AI）**
每个关键节点可挂载执行日志、截图、API 响应、Commit ID 和运行 Trace，形成**完整审计链**。

### **3.4 人类协同画布（Control Tower UI）**
可视化 UI 作为 **Agent Control Tower**，人类可以直接修改 AI 计划、插入任务节点、强制回滚或标注路径，实现真正的 **Human-in-the-loop**。

---

## **4. 行业应用场景：金融与量化**

CortexMap 的本地化与版本化设计，天然适配金融决策场景：

### **4.1 投资决策审计 (Investment Audit)**
记录 Agent 决策时的所有前置条件（如实时行情、研报摘要、风险偏好）。提供**秒级回溯**，通过 `commit` 链条还原决策瞬间的完整上下文。

### **4.2 量化策略状态管理 (Quant State Management)**
利用 **JSON Patch** 记录复杂量化策略的中间状态。即使策略进程意外崩溃，重启后可从最后一个 Commit 瞬间恢复，实现“断点续传”。

### **4.3 隐私与合规 (Privacy & Compliance)**
交易数据、敏感客户信息完全保留在本地 SQLite 中，满足金融行业严苛的数据隐私与合规要求。

---

## **5. 核心架构设计**

CortexMap 采用“三位一体”的本地化架构：

### **5.1 组件构成**
1.  **Desktop UI (Canvas)**: 基于 **Tauri + React/Svelte**。实时展示 Agent 的记忆拓扑和任务状态。
2.  **Embedded Local Server**: 随桌面应用启动的轻量级 **Rust HTTP Server**（默认监听 `127.0.0.1:1357`）。
3.  **Local Storage (SQLite)**: 
    *   **特性**: 支持 ACID 事务、JSON1 扩展、全文搜索 (FTS5)。
    *   **可靠性**: 默认开启 **WAL (Write-Ahead Logging)** 模式，支持高并发读写。

### **5.2 数据模型 (Git-like Schema)**
*   **`nodes`**: 存储节点当前快照。
*   **`edges`**: 存储节点间的关系。
*   **`commits`**: 记录每一次变更的元数据。
*   **`patches`**: 存储 **RFC 6902 (JSON Patch)** 格式的增量数据。
*   **`snapshots`**: 定期存储全量快照，加速加载。

---

## **6. 核心数据模型 (v0.2)**

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
    reasoning_trace?: string;   // AI 选择此节点的理由
  };
  children: string[];
}
```

---

## **7. 开发者集成**

### **7.1 集成流程**
1.  **初始化**: Agent 调用 `GET /status` 检查本地 CortexMap 是否在线。
2.  **读取上下文**: Agent 发送 `POST /query` 获取相关的“记忆子树”。
3.  **提交变更**: Agent 发送 `POST /commit`，携带 `patch` 数据更新外脑。
4.  **实时渲染**: 变更通过 **Tauri Event Bridge** 实时推送到前端 UI。

### **7.2 Python 集成示例**
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

## **8. 里程碑计划（v0.2）**

*   **Week 1 — 最小可运行内核**: 实现 `create_map`, `batch_patch`, `create_snapshot` 等 Headless 接口。
*   **Week 2 — 版本系统**: 完善 `snapshot`, `diff`, `rollback` 及冲突检测，交付 Git-like 引擎。
*   **Week 3 — 闭环集成**: 实现 Agent 执行与 CortexMap 自动回写的双向闭环。

---

## **9. 长期愿景**

CortexMap 的最终目标是成为：

> **AGI 时代的“外脑操作系统（External Brain OS）”**
