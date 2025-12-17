# 数据质量验证平台 (Data Validation Platform)

这是一个现代化的全栈数据质量管理与验证平台。它结合了 **Great Expectations** 的强大验证能力与 **GenAI** (Gemini/OpenAI) 的智能分析功能，帮助用户轻松定义规则、连接数据源并执行自动化质量检测。

## 🌟 核心特性

*   **全栈架构**：基于 **FastAPI** (后端) 和 **React + Vite** (前端) 构建，结构清晰，易于扩展。
*   **多源数据支持**：
    *   📂 **文件上传**：支持 CSV 数据文件上传与自动解析。
    *   🗄️ **数据库连接**：支持 MySQL, PostgreSQL, SQLite, Oracle 等主流数据库的直连验证。
*   **智能验证引擎**：
    *   ✅ **Great Expectations 集成**：内置工业级数据验证逻辑。
    *   🧠 **AI 辅助**：利用 AI 自动分析数据样本，推荐验证规则 (Expectations)。
    *   🤖 **语义校验**：支持通过自然语言 Prompt 进行非结构化的语义级数据检查。
*   **可视化工作流**：
    *   直观的 **规则构建器 (Suite Builder)**。
    *   实时的 **验证运行器 (Validation Runner)**。
    *   详细的 **历史报告 (Reports)**。
*   **容器化部署**：提供 Docker 和 Docker Compose 配置，一键启动。

## 🛠️ 技术栈

### 后端 (Backend)
*   **Framework**: FastAPI (Python 3.10+)
*   **ORM**: SQLModel (SQLAlchemy)
*   **Validation**: Great Expectations
*   **AI SDK**: Google Generative AI / OpenAI SDK

### 前端 (Frontend)
*   **Framework**: React 18
*   **Build Tool**: Vite
*   **Language**: TypeScript
*   **UI Components**: TailwindCSS + Lucide Icons

## 🚀 快速开始

### 方式一：使用 Docker (推荐)

最简单的运行方式是使用 Docker Compose 启动整个应用栈。

```bash
# 在项目根目录下运行
docker compose up --build 或 docker-compose up --build
```

启动后访问：
*   **前端页面**: http://localhost:5173
*   **后端 API**: http://localhost:8000/docs (Swagger UI)

### 方式二：本地开发运行

#### 1. 启动后端

```bash
cd backend

# 创建并激活虚拟环境 (可选)
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# 安装依赖
pip install -r requirements.txt

# 启动服务
uvicorn app.main:app --reload
```

#### 2. 启动前端

```bash
cd frontend

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

## 📂 项目结构

```text
├── backend/                # 后端代码
│   ├── app/
│   │   ├── api/            # API 路由定义
│   │   ├── core/           # 核心配置与工具 (DB, Config)
│   │   ├── models/         # SQLModel 数据库模型
│   │   └── services/       # 业务逻辑 (GX Service, AI Service)
│   ├── data/               # 上传文件存储目录
│   └── requirements.txt
│
├── frontend/               # 前端代码
│   ├── src/
│   │   ├── api.ts          # API 客户端封装
│   │   ├── components/     # React 组件
│   │   ├── contexts/       # 全局状态 (Config, Language)
│   │   └── types.ts        # TypeScript 类型定义
│   ├── index.html
│   └── vite.config.ts
│
├── docker-compose.yml      # Docker 编排文件
└── README.md               # 项目文档
```

## ⚙️ 配置说明

后端配置主要通过环境变量管理 (可创建 `backend/.env` 文件)：

```env
# 数据库连接 (默认使用 SQLite)
DATABASE_URL=sqlite:///./data/data.db

# AI 服务配置 (可选，用于智能建议功能)
GEMINI_API_KEY=your_gemini_key_here
OPENAI_API_KEY=your_openai_key_here
```

## 📝 使用流程

1.  **数据接入 (Data Source)**: 点击 "Data Source"，上传 CSV 文件或配置数据库连接信息。
2.  **规则定义 (Suite Builder)**:
    *   选择数据集。
    *   点击 "✨ AI Suggest" 自动生成规则，或手动添加规则 (如非空、唯一性、正则校验等)。
    *   保存规则套件 (Suite)。
3.  **执行验证 (Validation Runner)**: 选择数据集和规则套件，点击 "Run Validation"。
4.  **查看报告 (Reports)**: 查看验证结果详情、成功率及错误样本。
