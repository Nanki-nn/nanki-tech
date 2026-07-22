# 第 01 篇研究证据：一条聊天请求如何进入并驱动 Lead Agent

## 研究问题

一条消息从浏览器提交后，经过哪些边界，最终让 DeerFlow 的 Lead Agent 开始执行 `agent.astream()`？

## 版本

```text
DeerFlow 分支：main
DeerFlow commit：f0f9dd66
研究日期：2026-07-22
```

## 证据记录格式

每条重要证据使用以下字段：

```text
结论：
证据类型：源码事实 | 运行时观察 | 作者推断
DeerFlow commit：f0f9dd66
文件 / 符号 / 行号：
复现命令或测试消息：
观察结果：
待验证项：
```

## 静态调用链证据

### 最小路径

```text
sendMessage()
  → thread.submit()
  → LangGraph SDK HTTP POST
  → /api/langgraph/threads/{thread_id}/runs/stream
  → Nginx rewrite 为 /api/threads/{thread_id}/runs/stream
  → stream_run()
  → start_run()
  → resolve_agent_factory()
  → asyncio.create_task(run_agent(...))
  → agent_factory(...) == make_lead_agent(...)
  → agent.astream(...)
```

| 连接 | 类型 | 结论 |
|---|---|---|
| `sendMessage → thread.submit` | TypeScript 直接调用 | 发送函数整理输入、文件信息和运行上下文后调用 SDK hook 返回的 `submit` |
| `thread.submit → HTTP POST` | 第三方 SDK 边界 | DeerFlow 把 `getAPIClient()` 和 `assistantId="lead_agent"` 交给 `useStream`，网络请求由 LangGraph SDK 发出 |
| `/api/langgraph → /api` | Nginx 边界 | 默认 LangGraph base URL 是同源 `/api/langgraph`，Nginx 去掉 `langgraph/` 后转发给 Gateway |
| `stream_run → start_run` | Python 直接调用 | CodeGraph trace 确认 Gateway 内部第一跳 |
| `start_run → run_agent` | 异步任务调度 | `asyncio.create_task` 创建后台 worker，HTTP handler 不同步执行完整 Agent |
| `start_run → resolve_agent_factory` | Python 直接调用 | 根据 `assistant_id` 取得 callable |
| `run_agent → make_lead_agent` | 动态 callable | 静态图在这里断开；运行时的 `agent_factory` 实际为 `make_lead_agent` |
| `run_agent → agent.astream` | 动态对象方法 | worker 构造 Agent 后，通过 LangGraph graph 的异步流入口开始本轮执行 |

### 证据 1：前端固定使用 Lead Agent

```text
结论：聊天页面的 thread stream 使用 DeerFlow API client，并把 assistantId 固定为 lead_agent。
证据类型：源码事实
DeerFlow commit：f0f9dd66
文件 / 符号 / 行号：frontend/src/core/threads/hooks.ts / useThreadStream / 890-895
复现命令或测试消息：CodeGraph 搜索 useThreadStream 后读取已定位代码。
观察结果：useStream<AgentThreadState> 接收 client=getAPIClient(isMock)、assistantId="lead_agent"、threadId=onStreamThreadId。
待验证项：不适用。
```

固定版本链接：<https://github.com/Nanki-nn/deer-flow/blob/f0f9dd66/frontend/src/core/threads/hooks.ts#L890-L895>

### 证据 2：sendMessage 把消息和运行上下文交给 SDK

```text
结论：sendMessage 不是直接 fetch Gateway；它调用 thread.submit，并传入 messages、threadId、streamSubgraphs、streamResumable、recursion_limit 和 DeerFlow context。
证据类型：源码事实
DeerFlow commit：f0f9dd66
文件 / 符号 / 行号：frontend/src/core/threads/hooks.ts / sendMessage / 1208、1354-1385
复现命令或测试消息：读取已经由 CodeGraph 定位的 useThreadStream 局部源码。
观察结果：消息由 buildThreadSubmitMessages 生成；context 包含 thinking_enabled、is_plan_mode、subagent_enabled、reasoning_effort、thread_id 等字段。
待验证项：SDK 内部如何把 submit options 序列化为 HTTP body 留到第 02 篇。
```

固定版本链接：<https://github.com/Nanki-nn/deer-flow/blob/f0f9dd66/frontend/src/core/threads/hooks.ts#L1354-L1385>

### 证据 3：默认 LangGraph base URL 是 `/api/langgraph`

```text
结论：未设置 NEXT_PUBLIC_LANGGRAPH_BASE_URL 时，浏览器使用当前 origin 下的 /api/langgraph；SSR fallback 为 http://localhost:2026/api/langgraph。
证据类型：源码事实
DeerFlow commit：f0f9dd66
文件 / 符号 / 行号：frontend/src/core/config/index.ts / getLangGraphBaseURL / 20-43
复现命令或测试消息：读取配置函数。
观察结果：mock 模式使用 /mock/api；正常浏览器路径使用 `${window.location.origin}/api/langgraph`。
待验证项：浏览器 Network 面板中的实际 URL 待完整环境验证。
```

固定版本链接：<https://github.com/Nanki-nn/deer-flow/blob/f0f9dd66/frontend/src/core/config/index.ts#L20-L43>

### 证据 4：Nginx 去掉 `langgraph/` 后转发给 Gateway

```text
结论：/api/langgraph/* 会被改写为 /api/*，再代理到 Gateway。
证据类型：源码事实
DeerFlow commit：f0f9dd66
文件 / 符号 / 行号：docker/nginx/nginx.local.conf / location /api/langgraph/ / 42-45；docker/nginx/nginx.conf / 55-58
复现命令或测试消息：rg -n "api/langgraph|rewrite|proxy_pass" docker scripts
观察结果：本地配置执行 rewrite ^/api/langgraph/(.*) /api/$1 break; proxy_pass http://gateway。
待验证项：运行中的 Nginx 是否加载该配置待完整环境验证。
```

固定版本链接：<https://github.com/Nanki-nn/deer-flow/blob/f0f9dd66/docker/nginx/nginx.local.conf#L42-L45>

### 证据 5：Gateway 的流入口是 `stream_run`

```text
结论：Gateway 接收 POST /api/threads/{thread_id}/runs/stream，先调用 start_run，再把 sse_consumer 包装成 text/event-stream 响应。
证据类型：源码事实
DeerFlow commit：f0f9dd66
文件 / 符号 / 行号：backend/app/gateway/routers/thread_runs.py / router、stream_run / 32、423-448
复现命令或测试消息：CodeGraph trace stream_run → run_agent；读取 route decorator。
观察结果：router prefix 为 /api/threads；Content-Location 指向 /api/threads/{thread_id}/runs/{run_id}。
待验证项：SSE 消费与重连语义留到第 08 篇。
```

固定版本链接：<https://github.com/Nanki-nn/deer-flow/blob/f0f9dd66/backend/app/gateway/routers/thread_runs.py#L423-L448>

### 证据 6：`start_run` 创建记录并调度后台 worker

```text
结论：start_run 先创建 RunRecord、规范化输入和 config，再通过 asyncio.create_task 启动 run_agent；返回 record 不代表 Agent 已经执行完成。
证据类型：源码事实
DeerFlow commit：f0f9dd66
文件 / 符号 / 行号：backend/app/gateway/services.py / start_run / 514-669，重点 581-594、622-660
复现命令或测试消息：CodeGraph trace stream_run → run_agent；CodeGraph node start_run。
观察结果：agent_factory、graph_input、config、stream_modes 被传入 run_agent，task 保存到 record.task。
待验证项：RunManager 的冲突策略和完整状态机留到第 04 篇。
```

固定版本链接：<https://github.com/Nanki-nn/deer-flow/blob/f0f9dd66/backend/app/gateway/services.py#L622-L660>

### 证据 7：所有 assistant id 都映射到同一个 Lead Agent factory

```text
结论：当前 Gateway 的 resolve_agent_factory 无论收到哪个 assistant_id 都返回 make_lead_agent；自定义 Agent 通过 config/context 中的 agent_name 在工厂内部路由。
证据类型：源码事实
DeerFlow commit：f0f9dd66
文件 / 符号 / 行号：backend/app/gateway/services.py / resolve_agent_factory / 286-297
复现命令或测试消息：CodeGraph node resolve_agent_factory。
观察结果：函数局部导入并直接 return make_lead_agent。
待验证项：自定义 Agent 配置的内部选择逻辑留到第 05 篇。
```

固定版本链接：<https://github.com/Nanki-nn/deer-flow/blob/f0f9dd66/backend/app/gateway/services.py#L286-L297>

### 证据 8：worker 动态调用 factory 构造 Agent

```text
结论：run_agent 安装 runtime context、构造 RunnableConfig 后，把 agent_factory 当 callable 调用；这正是静态调用图无法直接连接到 make_lead_agent 的动态边界。
证据类型：源码事实
DeerFlow commit：f0f9dd66
文件 / 符号 / 行号：backend/packages/harness/deerflow/runtime/runs/worker.py / run_agent / 310-380
复现命令或测试消息：CodeGraph trace run_agent → make_lead_agent 返回 dynamic dispatch 提示；读取 run_agent 已定位代码。
观察结果：factory 是否接收 app_config 由 _agent_factory_supports_app_config 决定，两条分支都会返回 agent。
待验证项：factory 内部的模型、工具和 middleware 装配留到第 05、06 篇。
```

固定版本链接：<https://github.com/Nanki-nn/deer-flow/blob/f0f9dd66/backend/packages/harness/deerflow/runtime/runs/worker.py#L376-L380>

### 证据 9：`make_lead_agent` 进入内部工厂

```text
结论：make_lead_agent 是兼容 LangGraph Server ABI 的图工厂，它读取 runtime config 后调用 _make_lead_agent。
证据类型：源码事实
DeerFlow commit：f0f9dd66
文件 / 符号 / 行号：backend/packages/harness/deerflow/agents/lead_agent/agent.py / make_lead_agent / 430-434
复现命令或测试消息：CodeGraph node make_lead_agent。
观察结果：runtime app_config 存在时优先使用，否则读取 get_app_config()。
待验证项：_make_lead_agent 的装配过程留到第 05 篇。
```

固定版本链接：<https://github.com/Nanki-nn/deer-flow/blob/f0f9dd66/backend/packages/harness/deerflow/agents/lead_agent/agent.py#L430-L434>

### 证据 10：`agent.astream` 是第 01 篇的终点

```text
结论：worker 把请求的 stream modes 转为 LangGraph modes，并在 _stream_once 中执行 agent.astream；单模式和多模式分别走不同分支。
证据类型：源码事实
DeerFlow commit：f0f9dd66
文件 / 符号 / 行号：backend/packages/harness/deerflow/runtime/runs/worker.py / _stream_once / 404-483，重点 451、462
复现命令或测试消息：读取 CodeGraph 已定位的 run_agent 局部源码。
观察结果：messages-tuple 被映射为 messages；events 被跳过；无有效模式时默认 values。
待验证项：chunk 如何经过 StreamBridge 返回浏览器留到第 08 篇。
```

固定版本链接：<https://github.com/Nanki-nn/deer-flow/blob/f0f9dd66/backend/packages/harness/deerflow/runtime/runs/worker.py#L446-L483>

## 运行时断点记录

### 普通测试基线

```bash
cd /Users/bytedance/AI/deer-flow/backend
PYTHONPATH=. /opt/homebrew/bin/uv run pytest \
  tests/test_runtime_lifecycle_e2e.py::test_stream_run_executes_real_lead_agent_setup_agent_business_path \
  tests/test_runtime_lifecycle_e2e.py::test_stream_run_completes_and_persists_runtime_state \
  -q
```

结果：`2 passed, 1 warning in 30.53s`。warning 来自 LangGraph encrypted serde 的待弃用默认值，与当前调用链无关。

主测试用 fake chat model 替代外部模型，但没有替换 `resolve_agent_factory`。它通过真实 Gateway route、`start_run`、`run_agent`、`make_lead_agent` 和 `setup_agent` 工具路径运行，因此适合作为无模型密钥的确定性调试入口。

补充生命周期测试把 `resolve_agent_factory` 替换为小型 factory，重点验证 `metadata → values → end` 和持久化状态，不用于证明真实 Lead Agent factory。

### 调试方法与线程陷阱

第一次使用 `python -m pdb -m pytest` 设置断点时，只在模块导入阶段停住，业务函数没有命中。原因是 Starlette `TestClient` 把 ASGI 应用运行在名为 `asyncio-portal-*` 的后台线程，普通 Pdb 只跟踪启动 pytest 的主线程。

随后使用 Python `sys.settrace` + `threading.settrace` 的临时全线程 probe，只在目标业务文件和目标行收集脱敏的调用栈与局部变量摘要。probe 放在 `/tmp`，运行结束后已删除；DeerFlow 源码没有插入 `breakpoint()` 或日志语句。

全线程 probe 结果：`1 passed, 1 warning in 204.88s`。由于 Python 对后台线程逐行 trace，时间明显长于普通测试。

### 断点 1：`stream_run`

```text
结论：真实请求在 TestClient 的 asyncio portal 线程进入 stream_run。
证据类型：运行时观察
DeerFlow commit：f0f9dd66
文件 / 符号 / 行号：backend/app/gateway/routers/thread_runs.py / stream_run / 函数入口
复现命令或测试消息：全线程 probe + test_stream_run_executes_real_lead_agent_setup_agent_business_path
观察结果：body 类型为 RunCreateRequest；assistant_id=lead_agent；stream_mode=[values]；context keys 包含 agent_name、is_bootstrap、is_plan_mode、subagent_enabled、thinking_enabled；thread_id 为 36 字符 str。调用栈上一层业务函数为 authz.py::wrapper。
待验证项：不适用。
```

### 断点 2：`start_run`

```text
结论：stream_run 在同一 asyncio portal 线程 await start_run。
证据类型：运行时观察
DeerFlow commit：f0f9dd66
文件 / 符号 / 行号：backend/app/gateway/services.py / start_run / 函数入口
复现命令或测试消息：同上。
观察结果：调用栈相邻业务函数是 thread_runs.py:434:stream_run；body 与 thread_id 延续自 route。
待验证项：不适用。
```

### 断点 3：`resolve_agent_factory`

```text
结论：start_run 在 services.py:622 调用 resolve_agent_factory。
证据类型：运行时观察
DeerFlow commit：f0f9dd66
文件 / 符号 / 行号：backend/app/gateway/services.py / resolve_agent_factory / 函数入口
复现命令或测试消息：同上。
观察结果：调用栈为 resolve_agent_factory ← start_run ← stream_run；未经过其他 assistant router。
待验证项：不适用。
```

### 断点 4：`run_agent`

```text
结论：后台 worker 收到 pending RunRecord、messages graph input 和 make_lead_agent callable。
证据类型：运行时观察
DeerFlow commit：f0f9dd66
文件 / 符号 / 行号：backend/packages/harness/deerflow/runtime/runs/worker.py / run_agent / 函数入口
复现命令或测试消息：同上。
观察结果：agent_factory=deerflow.agents.lead_agent.agent.make_lead_agent；graph_input 类型为 dict、keys=[messages]；record.assistant_id=lead_agent；record.status=pending；config keys 为 configurable、context、recursion_limit。
待验证项：不适用。
```

### 断点 5：factory 动态调用

```text
结论：在 worker.py:376 到达 factory 分发前，Run 已转为 running，runtime context 已安装。
证据类型：运行时观察
DeerFlow commit：f0f9dd66
文件 / 符号 / 行号：backend/packages/harness/deerflow/runtime/runs/worker.py / run_agent / 376
复现命令或测试消息：同上。
观察结果：agent_factory 仍为 make_lead_agent；record.status=running；requested_modes=[values]；runtime_ctx 包含 thread_id、run_id、agent_name、app_config、user_id、user_role、is_bootstrap、thinking_enabled、is_plan_mode、subagent_enabled 等键；configurable 已增加 __pregel_runtime。
待验证项：不适用。
```

### 断点 6：`make_lead_agent`

```text
结论：worker 动态调用确实进入真实 make_lead_agent。
证据类型：运行时观察
DeerFlow commit：f0f9dd66
文件 / 符号 / 行号：backend/packages/harness/deerflow/agents/lead_agent/agent.py / make_lead_agent / 函数入口
复现命令或测试消息：同上。
观察结果：调用栈相邻业务函数为 worker.py:379:run_agent；RunnableConfig 已包含 callbacks、configurable、context、recursion_limit、run_name。
待验证项：_make_lead_agent 的内部装配留到第 05 篇。
```

### 断点 7：`agent.astream`

```text
结论：本次请求走单模式 astream 分支，Agent 从 messages 输入开始执行 values 流。
证据类型：运行时观察
DeerFlow commit：f0f9dd66
文件 / 符号 / 行号：backend/packages/harness/deerflow/runtime/runs/worker.py / _stream_once / 451
复现命令或测试消息：同上。
观察结果：input_payload 类型为 dict、keys=[messages]；lg_modes=[values]；single_mode 是长度 6 的 str（values）；record.status=running；调用栈为 _stream_once ← run_agent。
待验证项：生成的 chunk、StreamBridge 和 SSE 消费留到第 08 篇。
```

## 浏览器与 Nginx 验证

### 环境预检

```bash
cd /Users/bytedance/AI/deer-flow
PATH=/opt/homebrew/bin:/Users/bytedance/.bun/bin:$PATH make doctor
```

结果：`make doctor` 以 exit code 2 结束，汇总为 `1 error(s), 2 warning(s)`。

与当前文章相关的检查结果：

- Python 3.12.12、Node.js 22.22.2、pnpm 11.9.0、uv 0.9.7 正常；
- `.env`、`frontend/.env`、`config.yaml` 正常；
- `config.yaml` 版本为 v18，可以加载；
- 配置了 1 个模型；
- Local sandbox 已配置；
- 本机缺少 `nginx`，这是阻止标准 `make dev` 完整链路的唯一 error；
- web capture 和 host bash compatibility 是 warning，不是当前 HTTP 主链路的验证重点。

### 结论

```text
结论：本轮没有完成浏览器 → Nginx → Gateway 的运行时验证；前端提交和 Nginx rewrite 只能作为源码事实。
证据类型：运行时观察
DeerFlow commit：f0f9dd66
文件 / 符号 / 行号：环境预检；frontend/src/core/threads/hooks.ts；frontend/src/core/config/index.ts；docker/nginx/nginx.local.conf
复现命令或测试消息：PATH=/opt/homebrew/bin:/Users/bytedance/.bun/bin:$PATH make doctor
观察结果：模型和应用配置可用，但 nginx 命令不存在。没有安装系统软件，也没有启动一个绕过 Nginx 的替代环境来冒充标准路径。
待验证项：安装或提供 Nginx 后，使用浏览器 Network 面板核对请求 URL、Content-Location、thread id 和 run id。
```

Gateway → Lead Agent 的运行时证据由上一节的确定性 E2E 测试和全线程 probe 提供。正文必须明确区分这两段证据，不得写成“完整链路已亲自跑通”。

## 待验证项

- 安装或提供 Nginx 后，验证浏览器是否实际发出 `/api/langgraph/threads/{thread_id}/runs/stream`。
- 安装或提供 Nginx 后，验证运行中的服务是否使用 `nginx.local.conf` 中的 rewrite 规则。
- 浏览器请求与 Gateway 运行时中的 thread id、run id 是否对应。
- 本文刻意不验证 StreamBridge 的 chunk 转换与前端增量合并，它们属于第 08 篇。
