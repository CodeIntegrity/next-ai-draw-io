# Next AI Draw.io

A next.js web application that integrates AI capabilities with draw.io diagrams. This app allows you to create, modify, and enhance diagrams through natural language commands and AI-assisted visualization.

https://github.com/user-attachments/assets/b2eef5f3-b335-4e71-a755-dc2e80931979

Demo site: [https://next-ai-draw-io.vercel.app/](https://next-ai-draw-io.vercel.app/)

## Features

-   **LLM-Powered Diagram Creation**: Leverage Large Language Models to create and manipulate draw.io diagrams directly through natural language commands
-   **Image-Based Diagram Replication**: Upload existing diagrams or images and have the AI replicate and enhance them automatically
-   **Diagram History**: Comprehensive version control that tracks all changes, allowing you to view and restore previous versions of your diagrams before the AI editing.
-   **Interactive Chat Interface**: Communicate with AI to refine your diagrams in real-time
-   **Smart Editing**: Modify existing diagrams using simple text prompts
-   **Targeted XML Editing**: AI can now make precise edits to specific parts of diagrams without regenerating the entire XML, making updates faster and more efficient
-   **Improved XML Handling**: Automatic formatting of single-line XML for better compatibility and reliability

## How It Works

The application uses the following technologies:

-   **Next.js**: For the frontend framework and routing
-   **@ai-sdk/react**: For the chat interface and AI interactions
-   **react-drawio**: For diagram representation and manipulation

Diagrams are represented as XML that can be rendered in draw.io. The AI processes your commands and generates or modifies this XML accordingly.

## Getting Started

### Installation

1. Clone the repository:

```bash
git clone https://github.com/DayuanJiang/next-ai-draw-io
cd next-ai-draw-io
```

2. Install dependencies:

```bash
npm install
# or
yarn install
```

3. Create a `.env.local` file in the root directory. You can use `env.example` as a template:

```bash
cp env.example .env.local
```

Then update `.env.local` with your actual API keys:

Note: Not all variables are required. At minimum, you'll need at least one AI provider API key (OpenAI, Google, or OpenRouter).

### OpenAI-Compatible API Configuration

If you want to use an OpenAI-compatible API endpoint (such as a self-hosted model or third-party compatible service), configure these variables:

```bash
OPENAI_COMPATIBLE_BASE_URL="https://your-api-endpoint.com/v1"
OPENAI_COMPATIBLE_MODEL="your-model-name"
OPENAI_COMPATIBLE_API_KEY="your-api-key"
OPENAI_COMPATIBLE_TIMEOUT="60000"  # Optional, default timeout in milliseconds
```

**重要说明：**
- 必须同时设置这三个变量（`BASE_URL`、`MODEL` 和 `API_KEY`）才能使 OpenAI 兼容提供商正常工作
- `BASE_URL` 应该指向你的 API 的基础 URL（通常以 `/v1` 结尾）
- 应用程序会自动使用传统的 `/chat/completions` 端点（而非新版的 `/responses` 端点），以确保与更多 OpenAI 兼容 API（如 SiliconFlow、DeepSeek 等）的兼容性
- 如果配置了 OpenAI 兼容选项，将优先使用该配置而非 AWS Bedrock
- 请确保你的端点可访问且返回 OpenAI 格式的响应
- 如果遇到 404 错误，请验证你的基础 URL 是否正确以及端点是否已正确部署
- 环境变量中的引号和空格会被自动处理，确保模型名称不会被截断

**Important Notes:**
- All three variables (`BASE_URL`, `MODEL`, and `API_KEY`) must be set together for the OpenAI-compatible provider to work
- The `BASE_URL` should point to the base URL of your API (typically ending in `/v1`)
- The application uses the traditional `/chat/completions` endpoint (not the newer `/responses` endpoint) to ensure compatibility with more OpenAI-compatible APIs (such as SiliconFlow, DeepSeek, etc.)
- If the OpenAI-compatible configuration is present, it will be used instead of AWS Bedrock
- Make sure your endpoint is accessible and returns responses in OpenAI's format
- If you see 404 errors, verify your base URL is correct and the endpoint is properly deployed
- Environment variable quotes and whitespace are automatically handled to prevent model name truncation

4. Run the development server:

```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser to see the application.

## Deployment

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new) from the creators of Next.js.

Check out the [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

Or you can deploy by this button.
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FDayuanJiang%2Fnext-ai-draw-io)

### Docker 部署（中文）

参阅 [`DEPLOY_DOCKER_ZH.md`](./DEPLOY_DOCKER_ZH.md) 获取使用容器镜像部署应用的详细步骤。

## Project Structure

```
app/                  # Next.js application routes and pages
  extract_xml.ts      # Utilities for XML processing
components/           # React components
  chat-input.tsx      # User input component for AI interaction
  chatPanel.tsx       # Chat interface with diagram control
  ui/                 # UI components (buttons, cards, etc.)
lib/                  # Utility functions and helpers
  utils.ts            # General utilities including XML conversion
public/               # Static assets including example images
```

## Troubleshooting

### 404 Error with OpenAI-Compatible API

If you encounter a 404 error when using an OpenAI-compatible API endpoint:

1. **Verify the Base URL**: Ensure `OPENAI_COMPATIBLE_BASE_URL` is correct and accessible
   - The URL should typically end with `/v1` (e.g., `https://api.example.com/v1`)
   - Test the endpoint is reachable: `curl https://your-api-endpoint.com/v1/models`

2. **Check All Required Variables**: All three variables must be set:
   - `OPENAI_COMPATIBLE_BASE_URL`
   - `OPENAI_COMPATIBLE_MODEL`
   - `OPENAI_COMPATIBLE_API_KEY`

3. **Verify API Compatibility**: The endpoint must support OpenAI's API format
   - It should accept requests to `/v1/chat/completions`
   - It should return responses in OpenAI's format

4. **Check Deployment Environment**: If the app works locally but fails in deployment:
   - Verify environment variables are set correctly in your deployment platform
   - Check if your API endpoint is accessible from your deployment environment
   - Review deployment logs for configuration errors

5. **Fallback to Default Provider**: If you continue to have issues:
   - Remove or comment out the `OPENAI_COMPATIBLE_*` environment variables
   - The app will automatically fall back to AWS Bedrock

## TODOs

-   [x] Allow the LLM to modify the XML instead of generating it from scratch everytime.
-   [x] Improve the smoothness of shape streaming updates.

## License

This project is licensed under the MIT License.

## Support & Contact

For support or inquiries, please open an issue on the GitHub repository or contact the maintainer at:

-   Email: me[at]jiang.jp

---
