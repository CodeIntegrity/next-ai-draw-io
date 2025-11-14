# 更新日志：移除流超时限制并完善日志系统

## 变更概述

本次更新实现了以下功能：

1. **移除流式请求超时限制**
2. **增强流式数据块的日志输出**
3. **确认和验证环境变量可配置日志系统**

## 详细变更

### 1. 移除流式请求超时限制

#### 修改文件：`app/api/chat/route.ts`

- **移除 `maxDuration` 限制**：
  - 删除了 `export const maxDuration = 60` 配置
  - 这允许流式响应无限期运行，不会被 Next.js 路由处理器的默认超时中断

- **移除 `abortSignal` 超时配置**：
  - 删除了 `abortSignal` 相关代码（原第360-362行）
  - 删除了 `OPENAI_COMPATIBLE_TIMEOUT` 环境变量的使用
  - streamText() 调用不再传递 abortSignal 参数

- **清理未使用的导入**：
  - 移除了 `smoothStream` 导入（未使用）

#### 修改文件：`env.example`

- 移除了 `OPENAI_COMPATIBLE_TIMEOUT` 配置项
- 保留了其他必要的 OpenAI 兼容 API 配置

#### 修改文件：`README.md`

- 更新了 OpenAI 兼容 API 配置示例
- 移除了 `OPENAI_COMPATIBLE_TIMEOUT` 的说明

#### 修改文件：`STREAMING_DEBUG_GUIDE.md`

- 更新了超时配置章节
- 说明不再强制固定超时，长时间运行的流将持续到提供商完成响应

#### 修改文件：`NEWAPI_DEBUG_GUIDE.md`

- 移除了配置参考中的 `OPENAI_COMPATIBLE_TIMEOUT` 说明

### 2. 增强流式数据块的日志输出

#### 修改文件：`app/api/chat/route.ts`

在 `toUIMessageStreamResponse()` 返回后添加了流包装器，用于记录 UI 消息流的详细信息：

- **仅在 DEBUG 模式下启用**：只有当 `LOG_LEVEL=debug` 时才会包装流并记录详细信息
- **记录每个数据块**：
  - 块编号（Chunk 1, Chunk 2, ...）
  - 块大小（字节数）
  - 块内容预览（前150字符）
- **记录流总结**：
  - 总块数
  - 总字节数
- **错误处理**：捕获并记录流读取错误

日志输出示例（DEBUG 模式）：
```
[2025-01-XX] [DEBUG] === Wrapping response stream for chunk logging ===
[2025-01-XX] [DEBUG] UI message stream reading started
[2025-01-XX] [DEBUG] [UI Stream] Chunk 1 (256 bytes): 0:"text content..."
[2025-01-XX] [DEBUG] [UI Stream] Chunk 2 (128 bytes): 0:"more text..."
[2025-01-XX] [INFO] ✓ UI message stream complete. Total chunks: 25, Total bytes: 5432
```

**已有的流日志**（在自定义 fetch 函数中）：
- 第102-142行：记录 OpenAI 兼容 API 原始响应流的数据块
- 这些日志在 DEBUG 模式下显示 SSE 格式的原始数据

### 3. 日志系统验证

确认以下功能已完全实现：

#### `lib/logger.ts`
- ✅ 支持四个日志级别：error、warn、info、debug
- ✅ 通过 LOG_LEVEL 环境变量控制
- ✅ 默认级别为 error（最少日志）
- ✅ 提供了辅助方法（getLevel、isDebugEnabled、isInfoEnabled）

#### `env.example`
- ✅ 包含 LOG_LEVEL 配置说明
- ✅ 说明了各级别的含义
- ✅ 默认值设置为 error

#### 日志使用情况
- ✅ 所有业务代码已使用 logger.* 替代 console.*
- ✅ 测试脚本（test-*.js）仍使用 console.*（正常）
- ✅ logger.ts 内部使用 console.*（正常）

## 日志级别说明

### error（默认）
- 仅显示错误日志
- 适合生产环境，保持日志清洁

### warn
- 显示警告和错误日志
- 适合生产监控

### info
- 显示信息、警告和错误日志
- 显示重要的状态变化和里程碑事件
- 适合一般调试

### debug
- 显示所有日志，包括详细的调试信息
- 显示每个 API 请求/响应的详细内容
- 显示每个流数据块的内容
- 仅在深度调试时使用

## 使用示例

### 启用详细日志

在 `.env.local` 中设置：

```env
LOG_LEVEL=debug
```

或在运行时设置：

```bash
LOG_LEVEL=debug npm run dev
```

### 日志输出示例

#### ERROR 级别（默认）
```
[2025-01-XX] [ERROR] === Fatal Error in Chat Route ===
[2025-01-XX] [ERROR] Error details: ...
```

#### INFO 级别
```
[2025-01-XX] [INFO] OpenAI-compatible configuration detected
[2025-01-XX] [INFO] Using OpenAI-compatible provider: https://api.example.com/v1 with model: gpt-4o-mini
[2025-01-XX] [INFO] ✓ Streaming response detected - processing SSE stream
[2025-01-XX] [INFO] Stream complete. Total chunks: 25
```

#### DEBUG 级别
```
[2025-01-XX] [DEBUG] === Starting streamText call ===
[2025-01-XX] [DEBUG] Provider: OpenAI-compatible
[2025-01-XX] [DEBUG] === Outgoing API Request ===
[2025-01-XX] [DEBUG] URL: https://api.example.com/v1/chat/completions
[2025-01-XX] [DEBUG] Request Body: { model: '...', stream: true, ... }
[2025-01-XX] [DEBUG] Chunk 1: data: {"id":"chatcmpl-123",...}
[2025-01-XX] [DEBUG] [UI Stream] Chunk 1 (256 bytes): 0:"text content..."
```

## 兼容性说明

- ✅ 不影响现有功能
- ✅ 向后兼容所有环境变量配置
- ✅ 默认行为保持不变（error 级别日志）
- ✅ 支持所有 AI 提供商（OpenAI、AWS Bedrock、Google、OpenRouter、OpenAI 兼容）

## 测试建议

### 1. 测试流式响应不会超时

```bash
# 发送一个需要长时间响应的请求
# 例如：创建一个复杂的架构图
```

### 2. 测试日志级别

```bash
# 测试 ERROR 级别（默认）
npm run dev
# 应该看到很少的日志

# 测试 INFO 级别
LOG_LEVEL=info npm run dev
# 应该看到重要事件的日志

# 测试 DEBUG 级别
LOG_LEVEL=debug npm run dev
# 应该看到详细的请求/响应和流数据块日志
```

### 3. 验收测试清单

- [x] streamText() 不再有超时配置
- [x] 流式响应时能看到数据块的日志（DEBUG 模式）
- [x] LOG_LEVEL 环境变量能正确控制日志输出级别
- [x] 代码中所有 console.* 调用已替换为 logger.*（测试脚本除外）
- [x] env.example 中有 LOG_LEVEL 的配置示例和说明
- [x] 根据 LOG_LEVEL 值显示相应级别的日志

## 变更影响

### 性能影响
- **最小影响**：日志包装器仅在 DEBUG 模式下启用
- **生产环境**：默认 LOG_LEVEL=error，不会记录流数据块，性能无影响

### 行为变更
- **流式请求**：不再有 60 秒超时限制，可以运行更长时间
- **日志输出**：默认日志更少（仅错误），需要手动启用详细日志

## 后续建议

1. **监控生产环境**：
   - 观察长时间运行的流是否按预期工作
   - 监控是否有超时或中断问题

2. **日志管理**：
   - 生产环境建议保持 LOG_LEVEL=error
   - 调试时临时设置为 info 或 debug
   - 考虑添加日志轮转以管理日志文件大小

3. **性能优化**：
   - 如果发现流数据块日志影响性能，可以添加采样机制
   - 例如：只记录每10个块，或只记录块总结

## 相关文件

### 修改的文件
- `app/api/chat/route.ts` - 主要变更
- `lib/logger.ts` - 已存在，本次验证
- `env.example` - 移除超时配置
- `README.md` - 更新配置说明
- `STREAMING_DEBUG_GUIDE.md` - 更新超时说明
- `NEWAPI_DEBUG_GUIDE.md` - 更新配置参考

### 新增的文件
- `CHANGELOG_STREAM_TIMEOUT_LOGGER.md` - 本文档

## 问题反馈

如遇到问题，请：

1. 检查 LOG_LEVEL 环境变量设置
2. 启用 DEBUG 模式查看详细日志
3. 查看相关调试指南：
   - `STREAMING_DEBUG_GUIDE.md`
   - `NEWAPI_DEBUG_GUIDE.md`
4. 在 GitHub 提交 issue
