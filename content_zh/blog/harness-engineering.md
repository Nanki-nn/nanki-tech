# Harness Engineering - 是什么、怎么设计、往哪走

> 本文核心知识来自**addyosmani**的文章 [Harness Engineering](https://addyosmani.com/blog/agent-harness-engineering/)
>
>

[**Addy Osmani**](https://addyosmani.com/)是Google Cloud AI 总监。他是从**前端性能优化领域的大神**，转型到 **AI Agent 工程化**方向的技术领军人物，在前端圈和 AI 编程圈都有很高的影响力。

## 前言

LangChain 的 Viv 有句话：

> **Agent = Model + Harness。如果你不是模型，那你就是 Harness。**
>
>

原始大模型不是 Agent。只有赋予它工具、反馈循环和约束，它才可靠。这就是 Harness Engineering 要解决的问题。

本文从三个角度展开：Harness **是什么、怎么设计、往哪走**。

[**Vivek Trivedy**](https://x.com/Vtrivedy10)，是 LangChain 团队的核心成员之一。领导 LangChain Labs 团队的 Applied Research，专注于持续学习、harness engineering、以及数据挖掘与策展来构建更好的 Agent。

## 什么是harness?

![image.png](/blog-assets/harness-engineering/image.png)

[Viv](https://x.com/Vtrivedy10/status/2031408954517971368) 的一句话：

> Agent = Model + Harness. If you’re not the model, you’re the harness.
>
>

harness是指**除模型本身之外的所有代码、配置和执行逻辑**。原始模型并非agent。只有当harness赋予它**状态、工具执行、反馈循环和可强制执行的约束**时，它才成agent。

具体而言，harness包括：

- **指令与行为约束层**：System prompts, `CLAUDE.md`, `AGENTS.md`, skill ,  subagent prompts；

这些内容定义 Agent 的角色、行为规范以及项目上下文。

- **能力扩展层**：Tools, skills, MCP servers, and their descriptions；

- **运行基础设施**：filesystem, sandbox, browser

这些决定Agent 在哪里运行，以及它拥有怎样的执行能力。

- **编排层:** subagent spawning, handoffs, model routing

一个复杂开发任务, 如何拆分任务、如何分配 Agent、如何传递上下文，都属于 Harness 的职责。

- **Hooks 和 Middleware**

用于确定性执行，不完全依赖 Model 自己决定下一步，而是通过系统规则约束 Agent 行为。例如： Agent 修改代码  -> Hook 自动触发  ->  运行 lint/test  ->反馈错误  ->  Agent 修复

- **可观测性**：logs, traces, cost and latency metering

### Filesystem 与 Git：持久化状态

Filesystem 是 Agent Harness 中最基础的能力之一，但因为它很普通，往往容易被低估。

Model 只能直接操作 Context 中的信息。如果没有 Filesystem，Agent 本质上只能在聊天窗口里复制粘贴内容，而无法形成真正的工作流。

引入 Filesystem 后，Agent 获得了存放代码、数据、文档的工作空间； 能将中间结果移出 Context，减少上下文压力；

在此基础上加入 Git，则进一步提供：版本管理，错误回滚，实验分支。

实际上，大多数 Harness 能力最终都会依赖 Filesystem：

> Filesystem 是 Agent 持久化状态和持续工作的基础设施。
>
>

### Bash 和 Code Execution：通用能力工具

当前主流 Agent 的执行方式通常是 ReAct Loop：

```text
Reason
 ↓
Action / Tool Call
 ↓
Observation
 ↓
Repeat
```

[Simon Willison](https://simonwillison.net/) 认为，现在的 Agent 已经非常擅长执行 Shell 命令，大量任务都可以通过少量精心设计的命令完成。

因此：

> Bash + Code Execution 正逐渐成为 Agent 最通用的工具接口。
>
>

这类似于：

给一个人几个专用厨房工具；

或者直接给他一个完整厨房。

后者虽然复杂，但提供了更强的自主解决问题能力。

[Simon Willison](https://simonwillison.net/)是 Django 框架的联合创始人，也是当下 AI 应用开发领域最具影响力的独立实践者和意见领袖。他从 Python Web 开发顶流成功转型，目前专注于 LLM 应用、提示工程和 AI Agent 安全研究，凭借高频率的实战博客和开源工具（如 `llm`、Datasette），在 AI 编程圈拥有极高的声誉。

### Sandbox：让 Agent 安全执行

Bash 只有在安全环境里运行才有价值。直接在个人电脑上执行 agent生成的代码存在风险。

sandbox 为 agent 提供隔离的运行环境，使其可以：执行 code，检查文件，安装 依赖，验证工作成果，通过 allow-list 限制 commands，使用 network isolation，按需创建或销毁环境。

优秀 sandbox 还应具有良好默认配置，例如预装 language runtimes、packages、Git、test CLIs 和 headless browser。browser、logs、screenshots 和 test runners 使 agent 能观察自己的成果，从而闭合 self-verification loop。

### Memory 和 Search：让 Agent 持续积累知识

Model 的知识来源主要有两个：

1. Training weights

2. Current Context

当无法修改 Model 权重时，扩展知识最主要的方法就是：

> Context Injection
>
>

文件系统成为一种简单但有效的 Memory 机制。

文件系统再次成为基础。`AGENTS.md` 等 memory files 可以在每次启动时注入 context；agent 更新这些文件后，harness 在后续 session 中重新加载，从而让一个 session 中获得的知识传递到下一个 session。这是比较粗糙，但确实有效的 continual learning。

对于 模型训练之后的信息，例如新仓库版本、最新 文档 或当天数据，则需要 web search等 MCP tools。这些能力应当直接纳入 harness，而不是每次都由用户临时提供。

### Battling context rot

context rot 指的是：随着 context window 不断被填满，model 的 reasoning 和任务完成能力逐渐下降。

context 是稀缺资源，因此 harness 在很大程度上就是 context engineering 的 delivery mechanism。常见技术包括：

**Compaction**

当 context 接近上限时，harness 对旧内容进行总结，并把部分信息 offload 到其他位置，让 agent 能继续工作，而不是等 API 因超出限制而失败。

**Tool-call offloading**

两千行 logs 之类的大型 tool result 会占据大量 context，却未必带来同等信息量。harness 可以只保留 result 的开头与结尾，把完整内容存入 文件系统，让 agent 在真正需要时读取。

**Skills with progressive disclosure**

如果启动时把所有 tools 和 MCP instructions 全部放入 context，agent 还未行动，性能就已经受到影响。skills 可以只在任务需要时暴露相关 instructions 和 tools。

**Full context resets**

Anthropic 在 long-running harness 中还使用完整的 context reset：结束当前 session，根据简洁、结构化的 hand-off 文件 重建一个新 session。

对于特别长的任务，仅靠 compaction 并不足够。有时需要像给新工程师进行 onboarding 一样，用一份清晰 brief 重新开始。

### Hooks：强制执行层

Hooks 是区分 **“告诉 Agent 应该做什么”** 和 **“系统强制 Agent 做什么”** 的关键机制。

它本质上是一段在 Agent 生命周期特定节点自动执行的脚本，例如：

- Tool Call 前；

- 文件修改后；

- Commit 前；

- Session 启动时。

Hooks 适合处理那些 Agent 不应该忘记、但又经常遗漏的事情。例如：

- 每次修改代码后自动执行 Type Check、Lint、Test；

- 阻止危险命令（如 `rm -rf`、`git push --force`、`DROP TABLE`）；

- 提交代码或创建 PR 前要求人工审批；

- 写入文件后自动格式化代码。

HumanLayer 提出的一个重要原则是：

> **Success is silent, failures are verbose.（成功保持安静，失败提供详细反馈）**
>
>

也就是说，验证通过时不要额外消耗 Context；只有失败时，才将错误信息注入 Agent Loop，让 Agent 根据反馈自动修正。

因此，Hooks 本质上是在 Harness 中建立一个**低成本、高反馈的控制机制**：

> 不依赖 Agent 自觉遵守规则，而是通过系统约束和反馈循环，让 Agent 在错误发生时能够自动发现并修复。
>
>

### AGENTS.md 与 Tool 选择

`AGENTS.md` 是 Agent Harness 中高杠杆的配置点，会在每轮对话中注入 System Prompt，用于定义项目规则（如代码规范、测试方式、目录约束等）。

设计原则：

- **保持简短**：它应该像 Checklist，而不是完整的 Style Guide。规则越多，单条规则的注意力越低。

- **基于真实问题迭代**：每条规则都应该来自过去的错误或明确约束，而不是提前猜测。

Tool 设计同样如此。Tool 的 Name、Description、Schema 都会进入 Prompt，因此少量高质量 Tool 往往优于大量重复 Tool。

同时，Tool Description 本身也是 Prompt 的一部分，MCP Server 的内容会直接影响 Agent 行为，因此 Tool 设计不仅决定能力，也决定安全边界。

核心原则：

> **少而精的规则 + 清晰的 Tool 定义，比堆积 Instructions 和工具更能提升 Agent 可靠性。**
>
>



## 从行为反推 Harness 设计

![image.png](/blog-assets/harness-engineering/image-2.png)

Viv 提出的一个最有价值的设计方法是：

> 不要从“我要构建什么 Harness”出发，而应该从“希望 Agent 表现出什么行为”出发，再反推需要哪些 Harness 能力。
>
>

即： **目标行为 → Harness 设计**

每一个 Harness 组件，都应该对应 Model 本身无法可靠完成的一类行为。

例如：

- 需要持久化处理真实数据
→ Filesystem + Git

- 需要编写并执行代码
→ Bash + Code Execution

- 需要安全执行任务
→ Sandbox + 默认工具环境

- 需要记住新知识
→ Memory Files、Web Search、MCP

- 需要处理长 Context
→ Compaction、Tool Offloading、Skills

- 需要完成长期任务
→ Ralph Loop、Planning、Verification

这种设计方式的价值在于：每个 Harness 组件都有明确职责。

如果一个组件无法回答：

> “它解决了 Agent 的什么具体行为问题？”
>
>

那么它很可能是不必要的复杂度。

核心原则：

> **不要为了堆叠 Harness 能力而设计 Harness，而应该围绕 Agent 想要实现的行为，反向构建所需能力。**
>
>

## Long-horizon Execution：长程任务

长程任务是 Agent 最具价值、也是最难实现的能力之一。目前 Model 仍容易出现：

- Early stopping（提前结束）；

- 复杂任务拆解能力不足；

- 跨多个 Context Window 后失去连续性。

因此，需要通过 Harness 设计来解决这些问题。

**Ralph Loop**的核心思路是：当 Agent 试图结束任务时，由 Hook 拦截退出，并将原始目标重新注入新的 Context Window，迫使 Agent 继续执行。每轮 iteration 使用新的 Context，但通过文件系统读取上一轮 State，从而将 Single-session Agent 转变为 Multi-session Agent。

**Planning**则是让 Agent 先将目标拆解为多个步骤，并保存为 Plan File。执行过程中，Agent 根据计划推进，每完成一步，通过 Self-verification 检查结果；如果失败，Hook 将错误信息反馈回 Agent，让其修正。

此外，Anthropic 的实践表明，将 **Generator（生成）** 和 **Evaluator（评估）** 分离，通常比让 Agent 自我评估更可靠，因为 Agent 往往会高估自己的结果。

类似的模式还有 Sprint Contract：在开始执行前，先明确“完成”的标准（Done Condition），减少任务范围漂移（Scope Drift）。

核心思想：

> 长程 Agent 的关键不是单纯提升 Model 能力，而是**通过 Planning、Verification 和 Feedback Loop，让 Harness 帮助 Agent 持续完成复杂任务**。
>
>

## Harness 决定 Agent 能力的释放上限

模型能力决定 Agent 的理论上限，而 **Harness 决定这些能力能够被释放多少**。

很多开发者遇到 Agent 失败时，会默认认为：

> Agent 表现不好，是因为 Model 不够强，需要等待下一代模型。
>
>

但 Harness Engineering 认为，很多问题并不是 Model 的限制，而是 Harness 设计不足。

例如：

- Agent 不知道项目规范 → 将规则加入 `AGENTS.md`；

- Agent 执行危险操作 → 通过 Hook 和 Permission Gate 拦截；

- Agent 在复杂任务中迷失 → 引入 Planner / Executor 分离；

- Agent 生成错误代码 → 加入 Type Check、Test 等 Feedback Loop。

正如 HumanLayer 所说：

> “这不是 Model 问题，而是配置问题。”
>
>

一个典型案例是 [Terminal Bench 2.0](https://www.tbench.ai/benchmarks/terminal-bench-2)：同一个 Claude Opus 4.6 模型，在不同 Harness 环境下表现差异巨大。Viv 的团队仅通过优化 Harness，就将 Coding Agent 排名从 Top 30 提升到 Top 5。

他们没有更换 Model，而是优化：Tools、System Prompt、Verification、Feedback Loop。

这说明当前 Agent 的关键瓶颈，往往不是 Model 能力不足，而是 **Model 与实际应用之间存在 Harness Gap**。

未来 Agent Engineering 的竞争，不只是等待更强的模型，而是通过更优秀的 Harness，让现有 Model 发挥更接近理论上限的能力。

## Harness 不会消失，它会移动

一种常见但过于简单的观点是：**随着 Model 能力不断增强，Harness 的重要性会逐渐降低。**

但实际情况更加复杂。Model 的进步确实会让部分旧的 scaffolding（辅助机制）失去必要性。例如，Opus 4.6 显著缓解了 context anxiety（上下文焦虑）问题。过去，Sonnet 4.5 在接近 context limit 时，容易因为误判剩余上下文空间不足而提前结束任务。随着这一能力缺陷被 Model 自身修复，原本用于缓解该问题的 anxiety-mitigation scaffolding（焦虑缓解机制）便可以被移除。

然而，这并不意味着 Harness 变得不重要，而是意味着 Harness 的关注点会向新的复杂问题迁移。

![image.png](/blog-assets/harness-engineering/image-1.png)

图中显示的就是

- GEN N:  Harness: 规划 + 工具 + 验证

- GEN N+1:  Model吸收: 规划 + 验证 ； Harness新增: 长期记忆 + 多Agent

- GEN N+2:  Model吸收更多  ； Harness新增:  动态Context + 自调试 ;

**模型越来越聪明，会吞掉旧 Harness 的“智能部分”；但 Harness 不会消失，而会向更复杂的系统工程方向发展**：记忆、协作、评估、上下文管理、可靠执行

## Harness-as-a-Service（HaaS）

Viv 提出 **Harness-as-a-Service**：Agent 开发正在从 **LLM API** 转向 **Harness API**。

过去：

> LLM API 只提供模型能力，开发者需要自己实现 Loop、Tool Calling、State、Approval Flow。
>
>

现在：

> Harness API（如 Claude Agent SDK、Codex SDK、OpenAI Agents SDK）直接提供 Agent Runtime，包括 Loop、Tools、Context Management、Hooks 和 Sandbox，开发者只需进行业务定制。
>
>

Agent 开发模式也从：

> 自己构建 Agent Runtime
>
>

转变为：

> 选择 Harness Framework，围绕 System Prompt、Tools、Context、Subagents 四个核心进行优化。
>
>

这样 Agent 出问题时，不需要重新造一个 Agent，而是在已有 Harness 上迭代配置。

Viv 的观点：

> **Good agent building is an exercise in iteration. You can’t do iterations if you don’t have a v0.1.**
>
>

优秀 Agent 不是一次设计出来的，而是在 v0.1 基础上，通过持续反馈不断优化 Harness。

## 生产环境中的 Harness 形态

目前公开资料中，对成熟 Harness 架构描述最清晰的案例之一，是 Fareed Khan 对 Claude Code 架构的拆解。

![image.png](/blog-assets/harness-engineering/image-3.png)

Claude Code 的整体架构可以分为多个层：

- **Input Layer（输入层）**：负责用户交互，包括 User Interface、Session Manager、Permission Gate；

- **Knowledge Layer（知识层）**：负责上下文和知识管理，包括 Skill Registry、Context Compressor、Task Graph、Memory Store；

- **Integration Layer（集成层）**：负责 MCP Runtime 和外部服务接入；

- **Execution Layer（执行层）**：负责 Tool Dispatch、Streaming Runtime、Prompt Cache；

- **Output Layer（输出层）**：返回经过验证的任务结果；

- **Observability Layer（可观测层）**：包括 Event Bus 和 Background Executor；

- **Multi-agent Layer（多 Agent 层）**：负责 Subagent Spawn、Mailbox、FSM Protocol、Autonomous Board 和 Worktree Isolator。

整个系统的核心是 Agent Loop，各个层围绕它提供能力支持。

前文讨论的 Harness 概念，几乎都能在这张架构图中找到对应组件：

- Context Injection → Knowledge Layer；

- Loop State → Memory Store 和 Worktree Isolator；

- Destructive-action Hooks → Permission Gate；

- Subagent Context Firewall → Multi-agent Layer；

- Tool Dispatch Registry → MCP Servers 和 Bash 的统一入口。

Khan 的观点与 Viv 的核心思想一致，只是通过一个真实产品进行验证：

> **Claude Code 的演进，不仅取决于底层 Model 能力，更取决于围绕 Model 构建的 Harness。**
>
>

换句话说，优秀 Agent 的竞争，不只是“使用什么模型”，而是“如何构建让模型发挥能力的运行环境”。



## 结语

总结开头的问题harness**是什么、怎么设计、往哪走；**

从最简单的来看，**Agent = Model + Harness。**harness就是除了模型之外的所有东西，包括工具，约束，提示词等，有了这些模型之外的东西，才组成了能帮我们稳定完成任务的agent；

而我们需要设计harness的目的正是出于，**模型的输出本质是概率性事件**，**harness是我们对模型不确定性，不信任部分的具像化**，所以我们也应该从这些不信任的行为反推harness的设计；

对于harness往哪走，随着模型的发展，有一部分harness的能力会被模型吸收，但是在这过程中，又会有新的问题需要harness解决；

> （注：部分内容可能由 AI 生成）
