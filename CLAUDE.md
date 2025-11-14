# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

Next AI Draw.io 是一个基于 Next.js 的 AI 驱动图表创建工具，集成 draw.io 图表功能与多种 AI 提供商，支持通过自然语言创建和编辑图表。

## 开发命令

```bash
# 开发服务器（使用 Turbopack，端口 6002）
npm run dev

# 构建项目
npm run build

# 启动生产服务器（端口 6001）
npm run start

# 运行 ESLint 检查
npm run lint
```

## 环境配置

### 必需环境变量
创建 `.env.local` 文件，至少配置一个 AI 提供商：

```env
# OpenAI
OPENAI_API_KEY=your_openai_api_key

# 或 Google
GOOGLE_GENERATIVE_AI_API_KEY=your_google_api_key

# 或 AWS Bedrock
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_REGION=us-east-1

# 或 OpenRouter
OPENROUTER_API_KEY=your_openrouter_api_key

# OpenAI 兼容 API（如 SiliconFlow, DeepSeek 等）
NEW_API_BASE_URL=https://api.siliconflow.cn/v1
NEW_API_KEY=your_new_api_key
NEW_API_MODEL=deepseek-ai/DeepSeek-V2.5
```

### 可选配置
```env
# 日志级别（error, warn, info, debug）
LOG_LEVEL=error
```

## 项目架构

### 核心目录结构
```
app/                    # Next.js App Router
├── api/chat/          # AI 聊天 API 路由（核心逻辑）
├── layout.tsx         # 根布局组件
└── page.tsx           # 主页组件

components/            # React 组件
├── chat-panel.tsx     # 聊天面板主组件
├── chat-input.tsx     # 用户输入组件
├── draw-io-viewer.tsx # draw.io 图表查看器
└── ui/                # Radix UI 基础组件

lib/                   # 工具函数
├── logger.ts          # 可配置日志系统
├── chat-utils.ts      # AI 聊天工具函数
└── utils.ts           # 通用工具函数

contexts/              # React 上下文
└── messages-context.tsx # 消息状态管理
```

### 关键技术点

1. **AI 集成架构**：使用 Vercel AI SDK 统一处理多个 AI 提供商
   - 支持 OpenAI、Google、AWS Bedrock、OpenRouter
   - 支持 OpenAI 兼容 API（SiliconFlow、DeepSeek 等）
   - 流式响应处理在 `app/api/chat/route.ts`

2. **图表操作**：
   - XML 解析和修改使用 `@xmldom/xmldom`
   - 压缩使用 `pako`
   - draw.io 集成通过 `react-drawio`

3. **状态管理**：
   - 使用 React Context 管理消息状态
   - 图表 XML 状态在组件间传递

## 调试和测试

### API 测试脚本
```bash
# 测试基础 API 连接
node test-newapi-basic.js

# 测试流式响应
node test-siliconflow-stream.js
node test-newapi-stream.js
```

### 调试指南
- 查看 `STREAMING_DEBUG_GUIDE.md` - 流式响应调试
- 查看 `NEWAPI_DEBUG_GUIDE.md` - OpenAI 兼容 API 调试
- 设置 `LOG_LEVEL=debug` 获取详细日志

## 部署选项

### Vercel 部署
支持一键部署，需要配置环境变量。

### Docker 部署
查看 `DEPLOY_DOCKER_ZH.md` 获取详细的中文 Docker 部署指南。

构建独立模式：`next.config.ts` 已配置 `output: "standalone"`。

## 最近更新

1. **可配置日志系统**：支持四个日志级别，统一日志格式
2. **OpenAI 兼容 API 增强**：改进了流式响应处理，支持更多第三方 API
3. **移动端限制**：应用会检测屏幕宽度，在移动设备上显示提示

## 开发注意事项

1. **TypeScript**：项目启用严格模式，注意类型安全
2. **路径别名**：使用 `@/` 指向项目根目录
3. **AI 提供商切换**：在 `app/api/chat/route.ts` 中配置
4. **XML 操作**：修改图表时确保 XML 结构完整性
5. **流式响应**：处理 API 响应时注意错误处理和超时