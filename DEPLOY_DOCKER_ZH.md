# Docker 容器构建与部署说明

本文档说明如何使用仓库根目录下的 `Dockerfile` 构建镜像，并将应用以容器方式部署。

## 1. 前置条件

- 已安装 Docker（建议 20.10 及以上版本）
- 具备访问镜像构建所需网络资源的权限
- 准备好应用所需的环境变量（参考仓库中的 `env.example`）

## 2. 准备环境变量

1. 根据项目需求创建生产环境变量文件：
   ```bash
   cp env.example .env.production
   ```
2. 打开 `.env.production`，补充实际的 API Key、模型名称等配置。部署时会通过 `--env-file` 传入容器。

> 提示：容器启动后仍可通过 `docker exec` 或者在部署平台的环境变量面板中更新配置，但提前准备 `.env.production` 更便于一次性完成部署。

## 3. 构建镜像

在项目根目录执行以下命令：

```bash
docker build -t next-ai-draw-io:latest .
```

- `-t next-ai-draw-io:latest` 用于给镜像打标签，可根据需要替换为公司镜像仓库命名规范。
- 构建过程会执行 `npm ci` 与 `npm run build`，并使用 Next.js 的 `standalone` 产物以减小运行时体积。

## 4. 运行容器

构建完成后，可使用以下命令启动容器：

```bash
docker run -d \
  --name next-ai-draw-io \
  --env-file .env.production \
  -p 3000:3000 \
  next-ai-draw-io:latest
```

参数说明：
- `--env-file .env.production`：将环境变量注入容器。
- `-p 3000:3000`：将宿主机的 3000 端口映射到容器的 3000 端口。若需自定义端口，可修改前一个 `3000`。
- `-d`：以后台模式运行容器。

容器启动后，可通过 `http://localhost:3000` 访问应用。

### 使用 Docker Compose（可选）

若需要与其他服务编排，可编写 `docker-compose.yml`：

```yaml
services:
  next-ai-draw-io:
    image: next-ai-draw-io:latest
    env_file: .env.production
    ports:
      - "3000:3000"
    restart: unless-stopped
```

启动命令：

```bash
docker compose up -d
```

## 5. 运维与排错

- 查看容器日志：`docker logs -f next-ai-draw-io`
- 动态调整环境变量后重启容器：
  ```bash
  docker restart next-ai-draw-io
  ```
- 更新镜像后重新部署：
  ```bash
  docker stop next-ai-draw-io
  docker rm next-ai-draw-io
  docker build -t next-ai-draw-io:latest .
  docker run -d --name next-ai-draw-io --env-file .env.production -p 3000:3000 next-ai-draw-io:latest
  ```

## 6. 常见问题

1. **端口冲突**：确保宿主机映射端口未被占用，必要时修改 `-p HOST_PORT:3000` 中的 `HOST_PORT`。
2. **环境变量缺失**：若启动日志提示认证失败或模型不可用，请确认 `.env.production` 中的必填变量已配置。
3. **镜像过期**：当依赖更新或应用代码变动后，请重新执行 `docker build` 确保获得最新构建产物。

完成上述步骤后，即可在任何支持 Docker 的环境中快速部署 Next AI Draw.io 应用。祝使用顺利！
