# **CortexMap v0.2 — 产品规范**

> **Agent 原生记忆与状态层（Native Memory & State Layer for AI Agents）**
> —— 可读写、可回滚、可审计、可协作的结构化“外脑系统”。

---

## **1. 产品定位**

**CortexMap** 是面向 AGI/Agent 时代的**标准化外部大脑基础设施**，为所有 AI Agent 框架提供统一的：

* **长期记忆层（Memory Layer）**
* **任务状态层（State Layer）**
* **可视化协同层（Human-in-the-loop Layer）**

CortexMap 既是**机器可读写的 API 系统**，也是**人类可编辑的可视化画布**，作为多 Agent 协作的 **Single Source of Truth（单一事实源）**。

目标用户包括：

* Agent 框架开发者（LangGraph、Orchestra、AutoGPT、CrewAI 等）
* 企业 AI 自动化团队
* 研究型 AGI 系统
* RPA + AI 混合系统
* 复杂任务编排平台（如 AgentBook）

---

## **2. 核心价值主张**

CortexMap 解决三大行业级痛点：

1. **上下文爆炸（Context Overload）**

   * 不再依赖超长 Prompt
   * Agent 只按需加载**相关子树**

2. **Agent 失忆（Lack of Persistence）**

   * 任务状态可长期存储
   * 可跨对话、跨会话、跨 Agent 复用

3. **AI 不可审计（Black-box Behavior）**

   * 每一步都有证据链
   * 可回滚、可复现、可追溯

---

## **3. 产品核心特性**

### **3.1 API-First：按需上下文（Context-on-Demand）**

CortexMap 提供精细化子树检索：

* 按任务加载
* 按主题加载
* 按时间线加载
* 按依赖关系加载

Agent 只获取“需要的记忆切片”，避免 token 溢出。

---

### **3.2 Git-like 增量状态（Batch Patch）**

CortexMap 采用 **Git 风格状态管理**：

* 每次 Agent 执行 = 一次增量 patch
* 可：

  * diff
  * merge
  * rollback
  * create snapshot

这使 CortexMap 成为：

> **“Agent 的 Git 仓库”**

---

### **3.3 证据挂载（Auditable AI）**

每个关键节点可挂载：

* 执行日志
* 截图
* API 响应
* Commit ID
* 运行 Trace

形成**完整审计链**，适用于金融、制造、政务、医疗等合规场景。

---

### **3.4 人类协同画布（Control Tower UI）**

Web UI 作为 **Agent Control Tower**：

人类可以：

* 直接修改 AI 计划
* 插入新任务节点
* 强制暂停/恢复/回滚
* 标注正确/错误路径

真正实现 **Human-in-the-loop**。

---

## **4. 系统架构（分层）**

### **Layer 1：标准化 API（核心）**

语言无关，厂商无关：

```
POST   /maps                 # 创建脑图
GET    /maps/{id}/subtree    # 获取子树
PATCH  /maps/{id}            # 批量增量修改
POST   /maps/{id}/snapshot   # 生成版本快照
GET    /maps/{id}/diff       # 版本对比
POST   /maps/{id}/rollback   # 回滚
```

---

### **Layer 2：可插拔存储**

支持多后端（可选）：

* PostgreSQL（默认）
* Neo4j（图原生）
* MongoDB（文档型）

---

### **Layer 3：实时协同**

* REST：管理 API
* WebSocket：UI 实时同步

---

### **Layer 4：可视化画布**

推荐技术方向：

* React + React Flow
* 或 Miro-like 交互体验

---

## **5. 核心数据模型（v0.2）**

```ts
interface CortexNode {
  id: string;
  text: string;

  // 节点角色
  role: 'plan' | 'execution' | 'memory' | 'evidence' | 'reflection';

  // 业务类型
  type: 'task' | 'knowledge' | 'evidence' | 'summary';

  // 执行状态
  status: 'pending' | 'in_progress' | 'completed' | 'failed';

  metadata: {
    run_id?: string;
    evidence_url?: string;
    raw_data_digest?: string;

    // 可解释性字段
    reasoning_trace?: string;   // AI 选择此节点的理由
  };

  children: string[];
}
```

---

## **6. 工作流（标准闭环）**

```
Agent 读取 CortexMap
        ↓
生成执行计划（写入 CortexMap）
        ↓
执行任务
        ↓
回写结果 + 证据
        ↓
人类可审查/修正
        ↓
Agent 继续执行
```

---

## **7. 里程碑计划（v0.2）**

### **Week 1 — 最小可运行内核**

* create_map
* get_subtree
* batch_patch
* create_snapshot

交付：**可运行的 Headless Server**

---

### **Week 2 — 版本系统**

* snapshot
* diff
* rollback
* 冲突检测

交付：**Git-like 状态引擎**

---

### **Week 3 — AgentBook 集成**

* Agent 执行 → 自动回写 CortexMap
* CortexMap 影响 Agent 决策

交付：**执行—回写闭环系统**

---

## **8. 生态定位**

CortexMap 既可：

* 作为独立 SaaS
* 也可作为 AgentBook 的**内置记忆服务**

适配：

* LangGraph
* AutoGPT
* CrewAI
* Orchestra
* Custom Agents

---

## **9. 长期愿景**

CortexMap 的最终目标是成为：

> **AGI 时代的“外脑操作系统（External Brain OS）”**