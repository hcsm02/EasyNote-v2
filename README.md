<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# EasyNote

轻量级智能任务管理应用，支持 AI 语音输入和智能任务解析。

## ✨ 功能特点

- 📝 **任务管理**：创建、编辑、归档任务
- 🤖 **AI 智能**：语音输入识别、智能任务解析
- 📅 **时间分类**：今天、近两天、之后、历史
- 💾 **双模式存储**：本地存储（游客）/ 云端同步（登录）
- 📱 **响应式设计**：移动端优先

## 🚀 快速开始

### 前置要求

- Node.js 18+
- Python 3.10+

### 前端运行

```bash
cd frontend
npm install
npm run dev
```

访问: http://localhost:3000

### 后端运行

```bash
cd backend

# 创建虚拟环境
python -m venv venv

# 激活虚拟环境 (Windows)
.\venv\Scripts\activate

# 安装依赖
pip install -r requirements.txt

# 配置环境变量
cp .env.example .env

# 启动服务
python main.py
```

访问 API 文档: http://localhost:8000/docs

## 📁 项目结构

```
EasyNote/
├── frontend/           # React 前端
│   ├── App.tsx
│   ├── components/
│   ├── services/
│   └── ...
│
├── backend/            # FastAPI 后端
│   ├── main.py
│   ├── routers/
│   ├── models/
│   └── ...
│
└── docs/               # 项目文档
    ├── features.md
    └── implementation_plan.md
```

## 🔧 技术栈

| 层 | 技术 |
|----|------|
| 前端 | React 19, TypeScript, Vite |
| 后端 | Python, FastAPI, SQLAlchemy |
| 数据库 | SQLite (开发) / PostgreSQL (生产) |
| AI | Google Gemini API |

## 📖 文档

- [功能说明](docs/features.md)
- [实施计划](docs/implementation_plan.md)
