# DeerFlow 源码解读系列设计

## 目标

在 `/Users/bytedance/nanki-tech` 中创作一套中文 DeerFlow 源码解读系列。系列既用于公开发布，也作为作者通过费曼学习法深入理解 DeerFlow 的学习记录。

系列采用“一篇一篇完成”的节奏：每篇先研究和调试，再形成文章、图表与证据记录；作者确认当前篇后，才进入下一篇。

## 读者与写作定位

目标读者具备 Python 基础并使用过 LLM API，但没有深入理解 LangGraph。

文章需要解释理解当前主题所必需的 LangGraph 概念，但不写成 LangGraph API 手册。核心始终是 DeerFlow 的真实源码、运行时行为与工程设计。

每篇控制在约 3000～5000 字，只回答一个明确问题。文章同时满足以下目标：

- 初学者可以在不通读整个仓库的情况下理解当前主题；
- 关键结论可以由具体源码或运行时观察验证；
- 作者能够脱离专业术语，用自己的话复述机制；
- 单篇可以独立传播，连续阅读又能拼出完整系统。

## 系列组织方式

系列采用“先主链路，后专题扩展”的结构。

第一阶段沿一条真实聊天请求的生命周期展开。第二阶段再围绕 Sandbox、Tools、Skills、Memory、Subagent 等模块写独立专题。第三阶段可进一步讨论设计权衡、常见故障和二次开发实践。

本设计只规划第一阶段。第二、第三阶段的具体文章不在当前范围内，避免在尚未完成主链路时过早扩张选题。

## 第一阶段文章地图

| 篇次 | 文件 | 暂定标题 | 核心问题 | 主图 |
|---|---|---|---|---|
| 01 | `01-chat-request-to-lead-agent.md` | 一条聊天请求如何进入并驱动 Lead Agent | 从点击发送到 `agent.astream()`，完整主链路有哪些关键节点 | 端到端调用链总图 |
| 02 | `02-frontend-message-submit.md` | 消息如何从浏览器发出 | `sendMessage()`、`thread.submit()` 和请求上下文怎样组织 | 前端提交流程图 |
| 03 | `03-nginx-to-gateway.md` | `/api/langgraph` 请求去了哪里 | Nginx 如何改写路径，FastAPI 如何命中 `stream_run()` | 服务拓扑与路由图 |
| 04 | `04-run-lifecycle.md` | 一次 Run 是怎样诞生的 | `start_run()` 和 `RunManager` 如何创建、校验并调度任务 | Run 生命周期状态图 |
| 05 | `05-lead-agent-assembly.md` | Lead Agent 是怎样组装出来的 | `resolve_agent_factory()`、`make_lead_agent()` 如何选择模型、工具和配置 | Agent 工厂装配图 |
| 06 | `06-middleware-model-call.md` | 中间件如何包住一次模型调用 | `build_middlewares()` 的顺序如何影响请求、工具与结果 | 中间件洋葱模型图 |
| 07 | `07-model-tool-loop.md` | 模型为什么能够调用工具后继续运行 | AIMessage、Tool Call、ToolMessage 如何形成 Agent 循环 | Model–Tool 循环时序图 |
| 08 | `08-streaming-back-to-browser.md` | Token 如何一段段回到页面 | `agent.astream()`、`StreamBridge`、SSE 和前端 `useStream()` 如何协作 | 流式事件时序图 |

第 01 篇是浅层全景地图，只建立坐标和调试基线，不提前讲透后续模块。第 02～08 篇分别放大主链路的一段。

## 源码版本基线

第一阶段默认冻结在以下 DeerFlow 版本：

```text
仓库：/Users/bytedance/AI/deer-flow
分支：main
commit：f0f9dd66
验证日期：2026-07-21
```

每篇文章开头都记录分析版本、分支、验证日期和文章状态。源码引用优先使用绑定 commit 的 GitHub permalink；研究记录同时保留本地文件、符号和行号，方便调试。

写下一篇时如果 DeerFlow 上游已变化：

- 不影响当前主题时继续使用冻结基线；
- 修正了文章涉及的代码时，在正文增加“版本变化”说明；
- 主流程已经重构时，先决定升级整个系列基线，还是保留旧版分析并增加新版对照；
- 无法验证的结论标记为“待验证”，不能作为确定事实发布。

## 草稿目录

所有未发表内容放在站点内容目录之外，避免被当前博客构建流程自动发布：

```text
/Users/bytedance/nanki-tech/未发表/
└── deerflow-source-reading/
    ├── README.md
    ├── 01-chat-request-to-lead-agent.md
    ├── 02-frontend-message-submit.md
    ├── 03-nginx-to-gateway.md
    ├── 04-run-lifecycle.md
    ├── 05-lead-agent-assembly.md
    ├── 06-middleware-model-call.md
    ├── 07-model-tool-loop.md
    ├── 08-streaming-back-to-browser.md
    ├── assets/
    │   ├── 01/
    │   │   ├── request-flow.mmd
    │   │   ├── request-flow.svg
    │   │   └── request-flow.png
    │   └── ...
    └── research/
        ├── 01-evidence.md
        └── ...
```

`README.md` 维护系列地图、文章状态和阅读顺序。文章 Markdown 是跨平台发布的母稿。`research/` 保存断点记录、完整调用栈、未进入正文的证据和遗留问题。

文章正式发布到站点时，再单篇迁入 `content_zh/blog/` 并加入博客清单或合集；发布动作不属于当前设计的第一步。

## 单篇固定结构

每篇文章采用以下模板：

1. 这篇只解决什么问题；
2. 先用自己的话解释；
3. 最小概念模型；
4. 主流程图或架构图；
5. 真实源码调用链；
6. 关键代码解剖；
7. 跟我设置断点；
8. 运行时实际看到了什么；
9. 费曼复述：如果不用术语，该怎么讲；
10. 容易误解的地方；
11. 本篇小结与下一篇入口。

每篇原则上包含：

- 1 张主流程图；
- 最多 1～2 张辅助图；
- 3～5 个关键源码片段；
- 1 个可复现的断点实验；
- 1 段不依赖专业术语的费曼复述；
- 1 份独立的 `research/XX-evidence.md` 研究记录。

## 图表与多平台策略

Markdown 是唯一文章母稿。每张流程图或架构图都以 Mermaid 文件作为唯一可编辑源，并导出 SVG 与 PNG：

- Mermaid 源用于维护和支持 Mermaid 的平台；
- SVG 用于个人网站、知乎等适合矢量图的平台；
- PNG 用于图片兼容更稳定的平台。

图中调用方向、模块边界和状态变化必须来自已经验证的源码调用链或运行时观察。图表不能为了视觉简洁而反转真实调用方向。必要的简化需要在图注中说明。

## 研究与写作流程

每篇按以下流程生产：

```text
确定问题
  → 固定 DeerFlow commit
  → CodeGraph 建立调用链
  → 设置断点并实际验证
  → 整理 evidence 研究记录
  → 绘制 Mermaid 图
  → 写 Markdown 母稿
  → 核对源码事实与运行时观察
  → 导出 SVG/PNG
  → 作者审阅
  → 进入下一篇
```

### 1. 定界

用一句话定义当前文章的问题，同时列出明确不展开的内容。超出边界但值得写的内容进入后续文章或 `research/` 待办。

### 2. 源码研究

优先使用 DeerFlow 已初始化的 CodeGraph 索引回答结构问题：符号定义、调用关系、数据流和影响范围。只有在查询字符串、配置文本或 CodeGraph 未覆盖的局部细节时使用文本搜索。

关键结论记录到 `research/XX-evidence.md`，包含 DeerFlow commit、文件、符号、相关行号、结论类型和待验证问题。

### 3. 断点验证

启动 DeerFlow，发送与文章主题匹配的最小测试消息。按文章主线逐个断点，记录关键参数、运行时类型、调用栈和事件数据。密钥、令牌、Cookie、用户私有数据和完整模型请求不得写入文章或研究记录。

### 4. 费曼写作

先不引用源码，用作者自己的话解释机制；再用源码和运行时观察证明解释；最后增加不依赖 LangGraph、SSE、Middleware 等术语的复述。

### 5. 图表制作

图表只表达当前文章需要的关系。优先使用一张主图建立因果链，辅助图只用于主图无法同时表达的状态或时序。

### 6. 审阅

核对事实、复现步骤、图表与文章边界。作者确认当前篇后，才开始下一篇。

## 证据分类

正文中的重要结论区分为三类：

- **源码事实**：能指向具体 commit、文件和函数；
- **运行时观察**：通过断点、请求载荷或事件日志亲自验证；
- **作者解释**：为了帮助理解所做的类比或简化，需要明确它不是源码原话。

推断可以进入研究记录，但必须标记为推断。在得到源码或运行时证据前，不能把推断改写成确定事实。

## 单篇质量门槛

一篇文章只有满足以下条件才进入作者审阅：

- 只回答一个核心问题；
- 正文约 3000～5000 字；
- 所有重要源码结论绑定具体 commit；
- 调试步骤能够在冻结版本上重新执行；
- 图表与真实调用方向、状态变化一致；
- 明确区分源码事实、运行时观察和作者解释；
- 不泄露密钥、Cookie、用户数据或完整敏感请求；
- 目标读者无需阅读整个 DeerFlow 仓库即可理解；
- 结尾自然连接到下一篇，但不提前展开下一篇主题。

## 第 01 篇的边界

第 01 篇只建立从前端发送消息到 Lead Agent 开始流式执行的最小路径：

```text
sendMessage()
  → thread.submit()
  → POST /api/langgraph/threads/{thread_id}/runs/stream
  → Nginx 路径改写
  → stream_run()
  → start_run()
  → run_agent()
  → resolve_agent_factory()
  → make_lead_agent()
  → agent.astream()
```

正文会说明响应最终通过流返回前端，但 StreamBridge、SSE 事件格式和前端增量合并的细节留到第 08 篇。模型选择、工具装配和中间件内部顺序也只标出入口，分别留到第 05～07 篇。

## 不在当前范围内

- 立即把草稿加入站点博客清单或合集；
- 同步创作英文版本；
- 一次性生成全部 8 篇正文；
- 为文章系统新增自动发布或同步脚本；
- 因写作需要修改 DeerFlow 业务代码；
- 在第一阶段未完成前详细规划所有专题扩展文章。

## 验收标准

本系列设计执行成功的首个里程碑是第 01 篇完成：

1. `README.md`、第 01 篇母稿、对应研究记录和图表资产均位于约定的“未发表”目录；
2. 第 01 篇满足固定结构和质量门槛；
3. 断点实验已在冻结的 DeerFlow commit 上验证；
4. Mermaid、SVG 和 PNG 表达同一份已验证调用链；
5. 作者审阅并确认后，才开始第 02 篇。
