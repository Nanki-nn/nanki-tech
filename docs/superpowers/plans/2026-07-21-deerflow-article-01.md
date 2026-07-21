# DeerFlow 源码解读第 01 篇执行计划

## 目标

只完成 DeerFlow 源码解读系列的首个里程碑：初始化未发表系列目录，并产出第 01 篇《一条聊天请求如何进入并驱动 Lead Agent》的研究记录、可复现调试证据、主流程图和 Markdown 母稿。

本计划不生产第 02～08 篇正文，不把文章加入站点博客清单，也不修改 DeerFlow 业务代码。

## 工作仓库与冻结版本

| 用途 | 路径 | 基线 |
|---|---|---|
| 源码研究与调试 | `/Users/bytedance/AI/deer-flow` | `main@f0f9dd66` |
| 文章与资产 | `/Users/bytedance/nanki-tech` | 从当前工作树继续，只改本计划列出的新文件 |

执行前必须确认 DeerFlow 仍处于 `f0f9dd66`。如果 HEAD 已变化，停止并决定使用 detached worktree、切回冻结 commit，还是升级文章基线；不能静默地用新代码写旧版本文章。

`nanki-tech` 当前存在与博客合集功能相关的未提交改动。所有检查、暂存和提交必须按精确路径进行，不得把这些既有改动带入本系列。

## 交付物

```text
/Users/bytedance/nanki-tech/未发表/deerflow-source-reading/
├── README.md
├── 01-chat-request-to-lead-agent.md
├── assets/
│   └── 01/
│       ├── request-flow.mmd
│       ├── request-flow.svg
│       └── request-flow.png
└── research/
    └── 01-evidence.md
```

## 任务 1：初始化系列骨架

### 文件

- 新建 `未发表/deerflow-source-reading/README.md`
- 新建 `未发表/deerflow-source-reading/research/01-evidence.md`
- 新建 `未发表/deerflow-source-reading/assets/01/request-flow.mmd`
- 最后阶段再新建第 01 篇正文和图像导出文件

### README 内容

`README.md` 记录：

- 系列目标、目标读者和冻结 commit；
- 8 篇第一阶段文章地图；
- 状态取值：`未开始`、`研究中`、`待审阅`、`已确认`；
- 第 01 篇初始状态为 `研究中`，第 02～08 篇为 `未开始`；
- 一篇达到 `已确认` 后才开始下一篇的门禁。

### Evidence 模板

`01-evidence.md` 开头记录版本和文章问题，随后按结论重复使用：

```text
结论：
证据类型：源码事实 | 运行时观察 | 作者推断
DeerFlow commit：f0f9dd66
文件 / 符号 / 行号：
复现命令或测试消息：
观察结果：
待验证项：
```

### 完成条件

- 新目录位于 `content/` 和 `content_zh/` 之外；
- README 只把第 01 篇标为 `研究中`；
- 未提前创建第 02～08 篇正文。

## 任务 2：建立静态调用链证据

### 研究问题

确认下面这条最小路径中的每个箭头分别是源码静态调用、HTTP 边界还是动态 factory 分发：

```text
sendMessage()
  → thread.submit()
  → POST /api/langgraph/threads/{thread_id}/runs/stream
  → Nginx rewrite
  → stream_run()
  → start_run()
  → asyncio.create_task(run_agent(...))
  → resolve_agent_factory()
  → make_lead_agent()
  → agent.astream()
```

### CodeGraph 查询

在 `/Users/bytedance/AI/deer-flow` 上执行：

1. `codegraph_trace`：`stream_run` → `run_agent`，确认 Gateway 内部三跳路径；
2. `codegraph_node`：`start_run`，确认 RunRecord、factory、graph input、config 和后台 task 的构造；
3. `codegraph_node`：`resolve_agent_factory`，确认所有 assistant/custom-agent 请求最终返回 `make_lead_agent`；
4. `codegraph_node`：`run_agent`，确认动态调用 `agent_factory(...)` 和 `agent.astream(...)`；
5. `codegraph_node`：`make_lead_agent` / `_make_lead_agent`，确认运行时配置进入 Lead Agent 工厂；
6. 对已经定位的前端和 Nginx 文件，只读取当前主题所需的局部文本。

### 源码锚点

| 边界 | 文件与锚点 |
|---|---|
| 前端发送 | `frontend/src/core/threads/hooks.ts:1208` `sendMessage` |
| SDK 提交 | `frontend/src/core/threads/hooks.ts:1354` `thread.submit` |
| API client | `frontend/src/core/api/api-client.ts:170` `createCompatibleClient` |
| 默认 LangGraph URL | `frontend/src/core/config/index.ts` `getLangGraphBaseURL` |
| Nginx rewrite | `docker/nginx/nginx.local.conf:42`、`docker/nginx/nginx.conf:55` |
| SSE 路由 | `backend/app/gateway/routers/thread_runs.py:425` `stream_run` |
| Run 启动 | `backend/app/gateway/services.py:514` `start_run` |
| Factory 分发 | `backend/app/gateway/services.py:286` `resolve_agent_factory` |
| 后台 worker | `backend/packages/harness/deerflow/runtime/runs/worker.py:207` `run_agent` |
| Agent 构建 | `backend/packages/harness/deerflow/agents/lead_agent/agent.py:430` `make_lead_agent` |
| LangGraph 执行 | `backend/packages/harness/deerflow/runtime/runs/worker.py:451` / `:462` `agent.astream` |

行号只用于本地调试导航。正文引用应同时写出文件和符号，并尽量生成绑定 `f0f9dd66` 的 GitHub permalink，避免后续行号漂移。

### 完成条件

- `01-evidence.md` 至少包含上述九个边界的源码事实；
- 每个箭头明确标记为函数调用、HTTP/Nginx 边界或动态 callable；
- 没有用文本搜索重建 CodeGraph 已能直接给出的调用关系；
- 对仍未证实的连接标记为 `作者推断` 或 `待验证`。

## 任务 3：运行确定性的 Gateway → Lead Agent 调试实验

### 主实验

复用现有真实 Lead Agent factory 业务路径测试。它用 fake chat model 避免外部模型密钥，但仍通过 Gateway SSE 路由、`start_run`、`run_agent`、真实 `make_lead_agent` 和工具执行路径：

```bash
cd /Users/bytedance/AI/deer-flow/backend
PYTHONPATH=. uv run pytest \
  tests/test_runtime_lifecycle_e2e.py::test_stream_run_executes_real_lead_agent_setup_agent_business_path \
  -q
```

调试器中使用 `-s` 运行同一测试，并设置这些断点：

1. `thread_runs.py::stream_run`：观察 `thread_id`、`body.assistant_id`、`body.stream_mode`；
2. `services.py::start_run`：观察 `body.context`、`record.run_id`、`agent_factory`、`graph_input`、`config`；
3. `worker.py::run_agent`：观察 `record.status`、`runtime_ctx`、`requested_modes`；
4. `worker.py:376-379`：确认动态 `agent_factory` 实际指向 Lead Agent factory；
5. `agent.py::make_lead_agent`：观察 runtime config 如何进入 `_make_lead_agent`；
6. `worker.py:451` 或 `:462`：观察 `lg_modes`、`input_payload` 和第一项 stream chunk。

不得为了断点调试把 `breakpoint()`、日志打印或临时代码提交到 DeerFlow。优先使用 IDE/调试器的非侵入式断点。

### 补充生命周期实验

运行更小的 SSE 生命周期测试，验证事件顺序：

```bash
cd /Users/bytedance/AI/deer-flow/backend
PYTHONPATH=. uv run pytest \
  tests/test_runtime_lifecycle_e2e.py::test_stream_run_completes_and_persists_runtime_state \
  -q
```

预期至少验证 `metadata → values → end`，但文章第 01 篇只说明存在流式返回，不展开事件格式；详细内容留到第 08 篇。

### Evidence 记录

为每个实际命中的断点记录：

- 断点位置和调用栈上相邻的两个业务函数；
- 关键参数的类型和脱敏后的代表值；
- factory 的实际 callable；
- `agent.astream` 使用的输入类型和 stream mode；
- pytest 命令、通过结果和执行日期。

### 完成条件

- 两个指定测试在 `f0f9dd66` 上通过；
- 主实验实际命中 `stream_run`、`start_run`、`run_agent`、`make_lead_agent`、`agent.astream`；
- 研究记录不包含 token、Cookie、用户私有数据或完整敏感请求；
- 测试没有在 DeerFlow 留下业务代码改动。

## 任务 4：验证浏览器与 Nginx 边界

### 完整环境可用时

先运行：

```bash
cd /Users/bytedance/AI/deer-flow
make doctor
make dev
```

打开 `http://localhost:2026`，新建对话并发送最小测试消息：

```text
请只回复：debug-ok
```

在浏览器 Network 面板记录：

- 请求方法和 `/api/langgraph/threads/{thread_id}/runs/stream` 路径；
- 请求中的 `assistant_id`、`input.messages`、`context` 和 `stream_mode` 字段；
- `Content-Type: text/event-stream` 与 `Content-Location` 响应头；
- 与源码一致的 thread id 和 run id；
- 前端 `sendMessage` / `thread.submit` 的运行时参数。

Gateway 使用无 reload 的启动方式时断点更稳定：

```bash
cd /Users/bytedance/AI/deer-flow/backend
make gateway
```

如果分开启动服务，需要把前端的 LangGraph base URL 指向 Gateway 或继续通过 Nginx，不能把“直连 Gateway”误写成“Nginx 路径已验证”。

### 完整环境不可用时

如果缺少可用模型配置或启动依赖：

- 保留任务 3 的确定性后端运行时证据；
- 把前端提交和 Nginx rewrite 只归类为源码事实；
- 在 `01-evidence.md` 中明确记录“浏览器完整链路尚未运行时验证”；
- 正文不能使用“我们在浏览器中观察到”这类表述。

### 完成条件

- 浏览器/Nginx 边界要么有脱敏后的运行时证据，要么明确标记为只完成静态验证；
- 不截图或保存认证 Cookie、CSRF token、模型密钥；
- 停止本次启动的服务，不影响用户已有进程。

## 任务 5：绘制并导出主流程图

### Mermaid 内容

`assets/01/request-flow.mmd` 使用四个明确边界：

- Browser / Frontend；
- Nginx；
- Gateway；
- DeerFlow Harness / LangGraph。

图中必须表达：

- `thread.submit` 到 HTTP POST 是 SDK 边界，不是仓库内直接函数调用；
- Nginx 把 `/api/langgraph/*` 改写为 Gateway 的 `/api/*`；
- `start_run` 先返回 `RunRecord`，同时用 `asyncio.create_task` 启动 `run_agent`；
- `resolve_agent_factory` 返回 `make_lead_agent`，随后在 worker 中以 callable 方式动态调用；
- 第 01 篇的终点是 `agent.astream`，StreamBridge 只作为后续方向提示。

### 导出命令

不修改 `nanki-tech/package.json`。使用临时 Mermaid CLI 导出：

```bash
cd /Users/bytedance/nanki-tech
npx --yes @mermaid-js/mermaid-cli \
  -i 未发表/deerflow-source-reading/assets/01/request-flow.mmd \
  -o 未发表/deerflow-source-reading/assets/01/request-flow.svg \
  -b transparent

npx --yes @mermaid-js/mermaid-cli \
  -i 未发表/deerflow-source-reading/assets/01/request-flow.mmd \
  -o 未发表/deerflow-source-reading/assets/01/request-flow.png \
  -b white -w 2000
```

如果网络环境无法临时取得 CLI，保留 `.mmd` 并报告阻塞；不能用未经渲染验证的图满足完成条件。

### 完成条件

- `.mmd`、`.svg`、`.png` 三份资产存在；
- SVG 和 PNG 来自同一 Mermaid 源；
- 手工查看两种导出，节点文字不溢出、调用方向一致、中文可读；
- 图中没有提前展开中间件、工具循环和 SSE 事件细节。

## 任务 6：撰写第 01 篇 Markdown 母稿

### 文件

新建 `未发表/deerflow-source-reading/01-chat-request-to-lead-agent.md`。

### 文章头部

```text
分析版本：f0f9dd66
仓库分支：main
验证日期：实际调试日期
文章状态：待审阅
```

### 正文结构

1. **这篇只解决什么问题**：说明终点是 `agent.astream`，不展开返回流；
2. **先用自己的话解释**：把完整路径解释成“前台交单、门卫改地址、调度中心建任务、工厂装 Agent、worker 启动执行”；
3. **最小概念模型**：解释 Thread、Run、Lead Agent 三个概念；
4. **主流程图**：引用 `assets/01/request-flow.svg`，母稿中保留 Mermaid 源链接或可复制代码块；
5. **真实源码调用链**：逐段解释九个边界以及三种箭头类型；
6. **关键代码解剖**：只选 3～5 段，优先选择 `thread.submit`、`stream_run`、`start_run`、`resolve_agent_factory`、`run_agent/agent.astream`；
7. **跟我设置断点**：使用任务 3 的确定性测试作为主实验，完整浏览器实验作为可选扩展；
8. **运行时实际看到了什么**：只写已记录的观察；
9. **费曼复述**：不使用 LangGraph、SSE、middleware 等术语重新解释；
10. **容易误解的地方**：至少澄清 Thread 不等于 Run、factory 分发不等于直接静态调用、请求返回流不等于后台任务在 HTTP handler 内同步执行；
11. **小结与下一篇**：自然引出前端 `thread.submit` 的载荷细节。

### 写作约束

- 正文约 3000～5000 字；
- 每个源码片段服务于一个结论，不大段复制完整函数；
- 源码事实、运行时观察、作者解释使用明确措辞区分；
- 作者推断只能留在 research 文件，正文不把它写成事实；
- 不复述第 08 篇的 StreamBridge/SSE 细节；
- 文章语气沿用现有 Axon 系列的循序渐进风格，但不要假设读者读过 Axon 系列。

### 完成条件

- 文章结构完整，无 `TODO`、`TBD` 或空章节；
- 关键结论都能回指 `01-evidence.md`；
- 文章自身足以让目标读者画出最小主链路；
- README 中第 01 篇状态更新为 `待审阅`，其余文章保持 `未开始`。

## 任务 7：质量检查与交付

### 自动检查

```bash
cd /Users/bytedance/nanki-tech
wc -m 未发表/deerflow-source-reading/01-chat-request-to-lead-agent.md
rg -n "TODO|TBD|FIXME" 未发表/deerflow-source-reading
rg -n -i "api[_-]?key|authorization:|cookie:|csrf" 未发表/deerflow-source-reading
test -s 未发表/deerflow-source-reading/assets/01/request-flow.mmd
test -s 未发表/deerflow-source-reading/assets/01/request-flow.svg
test -s 未发表/deerflow-source-reading/assets/01/request-flow.png
git -C /Users/bytedance/AI/deer-flow status --short
git status --short
```

密钥扫描命中正常的安全说明时需要人工复核，不能机械删除；真正的凭据或用户数据必须移除。

### 人工检查

- 从文章正文反向核对每条路径与 `01-evidence.md`；
- 打开 SVG 和 PNG，检查中文、箭头和边界；
- 确认正文没有越界讲解第 02～08 篇；
- 确认所有调试命令与观察来自 `f0f9dd66`；
- 确认 DeerFlow 只有预期的 `.codegraph/` 未跟踪目录，没有调试残留；
- 确认 `nanki-tech` 原有未提交改动未被覆盖或暂存。

草稿位于站点内容目录之外，因此本阶段不要求 `npm run build`。迁入 `content_zh/blog/` 时再执行完整静态构建验证。

### 用户审阅门禁

交付时提供：

- 第 01 篇母稿链接；
- 主流程图预览；
- 已运行的测试命令和结果；
- 浏览器完整链路是否实际验证；
- 仍待验证或刻意留到后文的内容。

在用户明确确认之前：

- 不把 README 状态改为 `已确认`；
- 不开始第 02 篇；
- 不把草稿迁入正式博客目录；
- 不提交这些草稿文件，除非用户另行要求。

## 最终验收

第 01 篇达到 `待审阅` 状态时，本计划完成。最终必须同时具备：

1. 系列 README；
2. 第 01 篇 Markdown 母稿；
3. 结构化 evidence 研究记录；
4. Mermaid、SVG、PNG 三份同源主图；
5. 确定性 Gateway → Lead Agent 调试实验结果；
6. 浏览器/Nginx 边界的运行时证据，或明确的静态验证声明；
7. 对现有两个仓库工作树的保护说明。
