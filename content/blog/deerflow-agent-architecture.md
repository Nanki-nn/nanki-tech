**本文导读**

DeerFlow 是一个基于 LangGraph 构建的开源 Agent 框架，支持多模型供应商、工具与 MCP、子 Agent 委派、沙箱执行以及 Web、飞书、Slack 等多渠道接入。

本文从工程视角拆解 DeerFlow 的后端设计，围绕三条主线展开：复杂性来源、架构分层与编排、设计原则与模式。适合对 Agent 系统工程、LangGraph 实践或框架架构感兴趣的开发者阅读。

## 一、复杂性来源

DeerFlow 不只是一个让大模型调用工具的对话界面，真正上线运行时，它需要同时处理以下工程问题：

多种模型供应商、Sandbox、工具、MCP 和 Skills、主/子 Agent、记忆、上下文压缩、Token 预算和循环检测、用户澄清和中断恢复、SSE 流式输出等。

如果将这些逻辑全部堆进一个 Agent 类，代码很快会退化为无法维护的“超级类”——任何一处改动都可能牵一发而动全身。

DeerFlow 选择 LangGraph 作为 Agent 运行时底座，正是为了系统性地化解上述工程复杂度。在展开架构分析之前，有必要先回答一个基础问题：如果只用最朴素的 while 循环手写 Agent 流程，会遇到哪些难以逾越的障碍？LangGraph 又如何逐一应对？

### 1.1 while 循环 vs LangGraph

许多 Agent 项目的第一版实现，往往是一个 `while not done` 循环——每轮调用模型、解析工具调用、执行工具、把结果追加到消息列表，直到模型给出最终回答。这种写法在 demo 阶段足够直观，但一旦走向生产环境，几类工程问题会立刻暴露：

两者的核心区别可以用一句话概括：

> while 循环把 Agent 流程写进控制代码里；LangGraph 则把流程、状态和运行生命周期提升为可以独立定义和管理的一等对象。

- Checkpointer 让长任务可以在进程重启、用户刷新页面后从断点继续；

- streaming 决定了前端能否逐字输出而不是长时间白屏；图结构让运行时状态可观测、可调试；

- middleware 钩子使预算、安全、审计等横切能力不必侵入主循环；

如果用 while 循环逐一补全这些能力，最终会在业务代码里重新发明一个残缺的图运行时——这正是 DeerFlow 直接站在 LangGraph 之上的原因。

## 二、架构设计

### 2.1 Harness 和 App 分层

在 DeerFlow 的后端架构中，`Harness / App` 分层是最核心的边界之一——它将“**可复用的 Agent 框架能力**”与“**具体应用的接入逻辑**”彻底解耦。

- `backend/packages/harness/deerflow/`：可复用的 Agent 框架，包含：Agent 组装和执行；Middleware；Tools；Model；Sandbox；MCP；Skills；Subagents；ThreadState；Checkpointer；运行时上下文。

- `backend/app/`：具体应用层，主要包含：**Web 请求路由；外部 IM 渠道；应用层服务和认证逻辑**。

依赖方向是：

```text
App → Harness
```

### 2.2 Lead Agent 与 Subagent

复杂任务往往具备多维度、多步骤的特性，单次推理难以闭环。DeerFlow 2.0 的 Lead Agent 具备动态任务图拆解能力，可在执行期内将父级任务切割为若干可并行的子任务，并通过 Subagent 池进行分布式编排。

当前系统内置了两类专用 **Subagent** 实现：

- **general-purpose**：通用计算型，继承父 Agent **全部工具链**（递归调用 `task` 工具除外），单次会话轮次上限为 50 轮，适用于中等复杂度的子问题求解；

- **bash**：命令行专用型，工具集精简至沙箱底层原语（`bash`、`ls`、`read_file`、`write_file`、`str_replace`），会话轮次上限为 30 轮，适合执行脚本、文件操作与系统级指令。

#### 2.2.1 一次 task 委派是怎样执行的

一次委派的完整链路如下：Lead Agent 通过 `task(description, prompt, subagent_type)` 发起调用，`task` 工具负责校验子 Agent 类型、创建 `SubagentExecutor`、启动后台执行并轮询终态；而真正的子任务推理，则运行在一个全新的 `create_agent(...)` 循环中。

这条链路中有三个容易混淆的状态层次：

1. **继承运行环境：**Subagent 继承父运行的 Sandbox、线程目录、`thread_id`、`user_id`、`run_id` 与 Trace 元数据，因此它仍在同一个用户和线程隔离域内工作。

2. **隔离推理上下文：**Subagent 使用独立的 Agent Loop 和经过过滤的工具集；执行时会把 `subagent_enabled` 设为 `false`，因此不能再次调用 `task` 形成无限递归委派。

3. **不建立独立 Checkpointer：**Subagent 内部图使用 `checkpointer=False`。系统会持久化父线程状态和子任务事件投影，但这不等于可以从 Subagent 内部任意一个模型/工具步骤继续执行。

#### 2.2.2 为什么要采用这种主从结构

**上下文隔离**

命令日志、搜索片段和中间推理留在子任务中，主上下文只接收可消费的结果，降低上下文污染。

**能力隔离**

不同 Subagent 拥有不同工具集合和最大轮次，权限边界比“所有 Agent 共享全部工具”更容易审计。

**故障隔离与限流**

超时、取消、失败和并发数量可以在委派边界上控制，单个子任务不会直接接管整个主流程。

**可观测与可恢复**

运行时持续发出 `started`、`running`、`completed`、`failed` 等事件；Worker 将子任务步骤投影到事件存储，页面刷新后仍能恢复任务卡片。

### 2.3 Middleware：把横切能力从 Agent 主流程中抽离

**DeerFlow 没有把输入清洗、上下文注入、预算、安全、审计、摘要和异常处理写进 Agent 主循环，而是把它们拆成独立的 AgentMiddleware，再按稳定顺序装配到运行时。**严格来说，这不是 AspectJ 式的编译期织入，而是通过 Hook 链实现的 AOP 风格关注点分离。

#### 2.3.1 为什么 Agent 主循环需要 Middleware

Agent 的核心循环本来很简单：调用模型、解析工具请求、执行工具、把结果写回上下文，然后进入下一轮。但一个可上线的 Agent 系统还要处理大量不属于“推理业务”的工程问题。

**全部写进主流程**

输入清洗、权限、预算、审计、重试和记忆逻辑与 Model/Tool Loop 交织。每增加一种能力，都要修改主循环。

**通过 Middleware 织入**

主循环只负责推理与工具调度；横切能力各自实现 Hook，通过装配顺序决定生效时机和包裹关系。

这让 Lead Agent 保持稳定：新增一种横切能力，通常只需要增加 Middleware 或调整配置，而不需要重写 Agent Graph。

#### 2.3.2 Middleware 的六类拦截面

`AgentMiddleware` 提供多个生命周期和调用包裹 Hook。它们共同覆盖“一次运行”和“每一轮模型/工具循环”：

|Hook|执行时机|DeerFlow 中的典型用途|
|---|---|---|
|`before_agent`|一次 Run 开始|准备线程目录、Sandbox、动态上下文和预算状态|
|`before_model`|每次模型调用前|摘要压缩、持久上下文投影、图像信息和 Todo 注入|
|`wrap_model_call`|包裹模型 Provider 调用|输入清洗、异常归一化、Skill 激活、Token 预算和 SystemMessage 合并|
|`after_model`|模型返回后|Token 统计、标题生成、Subagent 并发限制、循环检测和安全终止处理|
|`wrap_tool_call`|包裹工具执行|Guardrail、Sandbox 审计、先读后写校验、错误转换和用户澄清|
|`after_agent`|一次 Run 结束|记忆更新、Sandbox 清理、预算与循环状态收尾|

#### 2.3.3 AOP 风格设计带来的收益

**主循环稳定**

Model/Tool Loop 不因新增预算、审计或安全策略而持续膨胀。

**能力可复用**

共享运行时 Middleware 可以同时服务 Lead Agent、Subagent 和 DeerFlowClient。

**配置可裁剪**

计划、视觉、摘要、Guardrail 和预算等能力按运行配置动态启停。

**测试更聚焦**

每个横切关注点可以独立测试，链顺序则由集成测试和架构文档共同约束。

### 2.4 沙箱

DeerFlow 中，用户会读写文件、执行命令、运行 Skills、调用子 Agent 并生成交付物。一旦给模型这些能力，模型输出就不能直接等同于可信代码，必须给它一个受控的执行边界。

如果这些操作直接发生在 **Gateway 宿主机**上，模型一次错误的路径判断或恶意输入，就可能影响整个服务、源码、数据库配置或其他用户数据。

因此 DeerFlow 提供了 `SandboxProvider` 抽象，可以切换：

- `LocalSandboxProvider`：文件操作映射到当前 Thread 的目录；

- `AioSandboxProvider`：在隔离 Docker 容器中执行命令；

- 其他扩展 Provider：例如远程或云端执行环境。

Agent 不只是执行命令，还需要一个持续存在的文件空间：

```python
/mnt/user-data/
├── uploads/    用户上传文件
├── workspace/  中间文件、代码、日志
└── outputs/    最终交付物
```

这些路径对 Agent 是统一的，但物理位置会按 `user_id + thread_id` 隔离。这样：

- 不同用户不会默认看到彼此的文件；

- 不同 Thread 的中间产物不会混在一起；

- Subagent 可以在同一个 Thread 工作区中交换文件；

- 只有 `outputs` 目录中的文件可以被 `present_files` 呈现给用户。

DeerFlow 让 Agent 永远使用 `/mnt/user-data/...` 这样的虚拟路径，底层 Provider 负责映射。于是上层的 `bash`、`read_file`、`write_file`、`ls`、`grep` 不需要知道当前运行在哪里。

> DeerFlow 用沙箱，是因为它要让 Agent 真正“做事”，而不是只生成文字；沙箱把模型的文件、命令和脚本能力限制在一个可隔离、可替换、可审计、可回收的执行空间里。

### 2.5 长期记忆

系统在对话流转中持续执行**隐性信息抽取——从自然交互中沉淀出结构化的语义实体**，涵盖用户身份特征、技术选型倾向、操作习惯以及关注领域的权重分布。这些提炼后的信号以 Fact 元数据的形式持久化到宿主机 `.deer-flow` 目录下的 JSON 文件。当新会话拉起时，引擎自动反序列化这些历史 Fact，并注入 Agent 的 System Prompt 中，使每一轮对话都具备长程上下文感知能力。

普通用户的长期记忆：

```python
{DEER_FLOW_HOME}/users/{user_id}/memory.json
```

`memory.json`

保存的是模型从历史对话中提炼出来的结构化长期信息，大致为：

```json
{
  "version": "1.0",
  "lastUpdated": "...",
  "user": {
    "workContext": {
      "summary": "...",
      "updatedAt": "..."
    },
    "personalContext": {
      "summary": "...",
      "updatedAt": "..."
    },
    "topOfMind": {
      "summary": "...",
      "updatedAt": "..."
    }
  },
  "history": {
    "recentMonths": {
      "summary": "...",
      "updatedAt": "..."
    },
    "earlierContext": {
      "summary": "...",
      "updatedAt": "..."
    },
    "longTermBackground": {
      "summary": "...",
      "updatedAt": "..."
    }
  },
  "facts": [
    {
      "id": "fact_xxx",
      "content": "用户偏好使用 Python",
      "category": "preference",
      "confidence": 0.9,
      "createdAt": "...",
      "source": "conversation"
    }
  ]
}
```

长期记忆体系划分为三个逻辑区块：

- **Profile（用户画像）**：记录工作背景、个人偏好及当前阶段性关注点；

- **Timeline（时间线）**：聚合近期交互摘要、历史任务上下文及长期积累的隐性知识；

- **Fact Base（事实库）**：沉淀具体可复用的知识点，每条 Fact 附带置信度评分（0.7–1.0）及分类标签，用于控制注入时的优先级与相关性筛选。

底层工程实现上，记忆更新流程采用**异步任务队列 + 内容去重 + 防抖节流**的三层设计，确保 I/O 操作不阻塞主对话线程。数据持久化策略选用原子写入机制，有效规避进程异常终止导致的文件损坏风险。所有记忆数据仅驻留于本地存储，用户拥有完整的数据所有权与控制权。

## 三、设计原则与设计模式

### 3.1 单一职责原则

DeerFlow 中，每个关键组件尽量只承担一种主要职责：

- Gateway 负责请求接入；

- RunManager 负责 Run 生命周期；

- Agent Factory 负责 Agent 组装；

- Middleware 负责横切能力；

- Model 负责模型交互；

- Tools 负责工具执行；

- Sandbox 负责隔离执行环境；

- StreamBridge 负责事件传递；

- Checkpointer 负责图状态持久化。

这些组件之间协作紧密，但各自的变更原因截然不同——Gateway 随接入渠道变化，RunManager 随生命周期模型变化，Sandbox 随执行环境变化。这正是单一职责原则在 DeerFlow 中的具体体现：每个组件只有一个引起它变化的原因。

### 3.2 依赖倒置原则

依赖倒置原则的核心是：**高层流程应当依赖抽象接口，而非具体实现**。这样一来，**底层实现的替换不会波及上层业务逻辑。**

例如，运行时依赖的是：

```text
RunStore
StreamBridge
SandboxProvider
BaseChatModel
```

而不是：

```text
MemoryRunStore
LocalSandboxProvider
ChatOpenAI
asyncio.Queue
```

以 Sandbox 为例，抽象接口定义在 `backend/packages/harness/deerflow/sandbox/sandbox_provider.py`，具体实现可以是：

- `LocalSandboxProvider`

- `AioSandboxProvider`

- `E2BSandboxProvider`

- BoxLite Provider

- 其他社区 Provider

上层只调用 `acquire()`、`get()`、`release()` 等抽象方法。

### 3.3 开闭原则

DeerFlow 的扩展方式主要是“增加实现”，而不是“修改主流程”。

可以通过以下方式增加能力：

- 增加新的 Middleware；

- 增加新的 Tool；

- 增加新的 MCP Server；

- 增加新的 Skill；

- 增加新的模型实现；

- 增加新的 Sandbox Provider；

- 增加新的 StreamBridge；

- 增加新的 RunStore。

理想情况下，上述任何一种扩展都不需要修改 Lead Agent 的核心模型循环——这正是开闭原则“对扩展开放、对修改关闭”的目标：**新增能力通过添加实现类或配置完成，而非侵入式地修改已有流程。**

### 3.4 工厂模式：隐藏复杂对象的创建过程

DeerFlow 在多个关键位置使用了工厂模式，将复杂对象的创建逻辑封装在统一入口之后，调用方无需关心对象构造的内部细节。

Lead Agent 工厂：

```text
def make_lead_agent(config: RunnableConfig):
    return _make_lead_agent(...)
```

模型工厂：

```text
create_chat_model(...)
```

这些工厂入口共同隐藏了对象创建过程。

调用方不需要了解：

- 模型类如何解析；

- 模型参数如何从配置转换；

### 3.5 责任链模式：Middleware 按顺序传递请求

`build_middlewares()` 生成一个有顺序的 Middleware 列表：

```text
Input Sanitization
   ↓
Thread Data
   ↓
Sandbox
   ↓
Dynamic Context
   ↓
Skill Activation
   ↓
Memory
   ↓
Summarization
   ↓
Token Budget
   ↓
Loop Detection
   ↓
Tool Error Handling
   ↓
Clarification
```

每个 Middleware 可以：

- 处理请求后继续传递；

- 修改请求后继续传递；

- 修改返回结果；

- 转换异常；

- 直接中断整个流程。

例如：

- TokenBudgetMiddleware 可以阻止超出预算的调用；

- LoopDetectionMiddleware 可以打断重复工具调用；

- ClarificationMiddleware 可以把一次工具调用转换成用户中断；

- ToolErrorHandlingMiddleware 可以把异常转换成 ToolMessage，让 Agent 继续运行。

这比单纯的“多个钩子函数”更接近责任链：

> 请求沿着一条处理链前进，每个节点都有机会处理、修改或终止请求。

## 四、总结

DeerFlow 的架构设计体现了一条清晰的工程思路：

1. **先划边界**：通过 Harness / App 分层、Lead Agent 与 Subagent 的主从编排，把变化隔离在不同模块中，避免所有逻辑堆进一个“超级类”。

2. **再定原则**：以单一职责、依赖倒置和开闭原则约束依赖方向，让高层流程依赖抽象而非具体实现。

3. **最后落地**：用工厂函数隐藏复杂对象的创建过程，用责任链式的 Middleware 装配横切能力，使新增能力通常不需要重写 Agent 主循环。

这套设计的核心收益是：**主循环保持稳定，横切能力可复用、可裁剪、可独立测试，运行时配置可以动态决定真正装配的组件集合。**

对于正在构建或维护 Agent 系统的团队来说，DeerFlow 提供了一个可参考的工程范式——Agent 不只是“让大模型调用工具”，更是一个需要认真对待的分布式系统。架构划分、依赖控制和模式落地，三者缺一不可。

> （注：部分内容可能由 AI 生成）
