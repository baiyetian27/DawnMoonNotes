# 曦月笔记 — AI 开发指引

## 项目概述
「曦月笔记」是一款面向个人用户的笔记应用，支持安卓手机（独立 APK + PWA）和网页多端使用，数据存储在设备本地（IndexedDB），无需登录、无需联网。UI 风格为深色科技风 + 紫色主色调。

Android 端使用系统内置 WebView 加载 PWA，无需安装 Chrome 或任何第三方浏览器。

---

## 标准文件路径

开发过程中的所有决策和规范，**必须参考以下文件**：

| 文件 | 用途 | 何时查阅 |
|------|------|----------|
| `docs/需求规格.md` | 完整功能需求说明 | 实现任何功能前，先读对应需求 |
| `docs/技术架构.md` | 技术选型、架构图、文件结构 | 创建新文件或做技术决策时 |
| `docs/设计规范.md` | 颜色、字号、间距、圆角、动效 | 写 UI 代码时严格对照 |
| `docs/数据库设计.md` | IndexedDB 数据结构 | 做数据 CRUD 时对照字段定义 |
| `docs/开发阶段.md` | 分阶段任务清单 + 里程碑 | 每阶段开始和结束时核对 |
| `docs/数据迁移指南.md` | 换手机数据迁移说明 | 用户需要迁移数据时参考 |
| `docs/部署指南.md` | Vercel 部署步骤 | 第 10 阶段部署时使用 |

---

## 开发日志

- 路径：`开发日志/YYYY-MM-DD.md`
- 每天开始开发时，检查当天日志是否已存在，不存在则创建
- 每完成一个阶段步骤，更新日志的「今日完成」部分
- 遇到问题立即记录到「遇到的问题」部分
- 当天结束时更新「待办事项」和「下一阶段计划」

---

## 核心工作原则

### 分阶段推进
1. **一次只做一个阶段**，不跳步
2. 每个阶段：完成 → 浏览器验证 → 记录日志 → 再推进下一阶段
3. 每个里程碑（M1~M6）完成后，主动告知用户可以体验

### 代码规范
- TypeScript 严格模式，避免 `any` 类型
- 组件文件使用 PascalCase（如 `NoteCard.tsx`）
- Hook 文件使用 camelCase + `use` 前缀（如 `useNotes.ts`）
- Service 文件放在 `src/services/`，与组件逻辑分离
- 所有数据操作通过 Service 层，组件不直接调用 Dexie.js
- 使用 Tailwind CSS 原子类，避免自定义 CSS（除非设计规范要求）

### 提交前检查
- [ ] 代码无 TypeScript 错误
- [ ] `npm run dev` 正常启动
- [ ] 当前阶段功能在浏览器验证通过
- [ ] 开发日志已更新
- [ ] `docs/开发阶段.md` 中对应步骤已勾选

### 安全注意
- 数据纯本地存储，无需网络即可使用
- 更换手机需通过设置页导出/导入数据

### 用户体验
- 每完成一个里程碑（可看到明显功能），主动告诉用户
- 告知方式：说明完成了什么 + 如何体验（`npm run dev`）
- 第 10 阶段完成后，告知用户公网 URL

---

## 常用命令

```bash
npm run dev          # 启动开发服务器 (http://localhost:5173)
npm run build        # 构建生产版本
npm run preview      # 本地预览生产构建
npm run lint         # 代码检查（如果配置了）
```

---

## Android 项目

### 标准文件路径

| 文件 | 用途 | 何时查阅 |
|------|------|----------|
| `twa/app/src/main/java/com/xiyue/notes/MainActivity.java` | WebView 主 Activity | 修改 Android 端行为时 |
| `twa/app/src/main/AndroidManifest.xml` | 应用清单（权限、主题、Intent） | 修改权限或 Activity 配置时 |
| `twa/app/build.gradle` | App 模块构建配置 | 修改依赖或 SDK 版本时 |
| `twa/build.gradle` | 项目级 Gradle 配置 | 修改 Gradle 插件版本时 |
| `twa/settings.gradle` | Gradle 项目设置 | 修改模块结构时 |
| `twa/release.keystore` | APK 签名密钥 | 签名 APK 时 |
| `twa/gradle-dist/` | Gradle 8.2 分发版 | 已内置，无需额外安装 |
| `public/.well-known/assetlinks.json` | TWA 验证文件（WebView 方案不需要） | 仅参考 |
| `.github/workflows/deploy.yml` | 前端部署到 GitHub Pages | 修改部署流程时 |

### Android 构建命令

```bash
# 设置 Java 环境（Windows Git Bash）
export JAVA_HOME="/c/Program Files/Eclipse Adoptium/jdk-21.0.11.10-hotspot"
export PATH="$JAVA_HOME/bin:$PATH"

# 构建 release APK
cd twa
./gradle-dist/gradle-8.2/bin/gradle assembleRelease

# APK 输出路径
# twa/app/build/outputs/apk/release/app-release.apk
```

### 签名信息

| 项目 | 值 |
|------|-----|
| Keystore | `twa/release.keystore` |
| 密码 | `xiyuenotes` |
| 别名 | `xiuye` |
| 包名 | `com.xiyue.notes` |
| 密钥算法 | RSA 2048 |

### Android 架构说明

- **方案**：原生 Activity + 系统 WebView，非 TWA
- **优势**：不依赖 Chrome/Edge 等第三方浏览器，WebView 是 Android 系统内置组件
- **数据**：WebView 内 IndexedDB 由应用沙箱隔离，卸载 App 时自动清除
- **离线**：由 PWA Service Worker 提供离线缓存能力

### App 图标

| 文件 | 用途 | 何时查阅 |
|------|------|----------|
| `public/pwa-192.svg` | 图标源文件（🌙 emoji + 曦月文字） | 修改图标设计时 |
| `public/pwa-512.svg` | 图标源文件（高分辨率版） | 生成高分辨率图标时 |
| `scripts/generate-icons.mjs` | 从 SVG 生成各密度 mipmap PNG | 修改图标后重新生成 |
| `twa/app/src/main/res/mipmap-{density}/ic_launcher.png` | 5 种密度启动器图标 | APK 打包时自动使用 |
| `twa/app/src/main/res/mipmap-anydpi-v26/` | 自适应图标（已删除，使用 PNG 直出） | 如需恢复自适应图标时重建 |
| `twa/app/src/main/res/drawable/ic_launcher_foreground.xml` | 矢量前景（已弃用） | 仅参考 |
| `twa/app/src/main/res/drawable/ic_launcher_background.xml` | 图标背景色 | 修改背景色时 |

**图标生成命令**：`node scripts/generate-icons.mjs`

**关键注意事项**：
- Android 矢量图 (`VectorDrawable`) 不支持 emoji 文字渲染 → 图标必须通过 sharp 渲染为 PNG
- 删除 `mipmap-anydpi-v26/` 后，系统直接使用 mipmap PNG，不经过自适应图标层
- 修改图标时，先编辑 `public/pwa-512.svg`，再运行生成脚本

### WebView JavaScript 桥接（数据迁移）

**核心概念**：WebView 中纯 DOM API 无法触发文件下载和文件选择，必须通过原生侧 `@JavascriptInterface` 处理。

| 文件 | 用途 |
|------|------|
| `MainActivity.java` → `Bridge` 内部类 | `saveBackup()` / `pickBackupFile()` JS 桥接方法 |
| `src/services/migration.ts` | 导出/导入逻辑，自动检测 WebView 环境走不同路径 |
| `src/pages/SettingsPage.tsx` | 设置页，数据迁移按钮 UI |

**数据流**：
- **导出**：`migration.ts` → 检测 `window.Android` → 调用 `Android.saveBackup(json, filename)` → 原生写入 Downloads/曦月笔记/ → 回调通知前端路径
- **导入**：`migration.ts` → 检测 `window.Android` → 调用 `Android.pickBackupFile()` → 原生打开文件选择器 → 读取文件内容 → 回调传给前端

**WebView 环境检测**：`typeof window !== 'undefined' && 'Android' in window`

---

## 技术栈速查

- **前端框架**：React 19 + TypeScript
- **构建工具**：Vite 8
- **UI 样式**：Tailwind CSS v4
- **路由**：React Router v7
- **富文本**：TipTap (ProseMirror)
- **本地数据库**：Dexie.js (IndexedDB 封装)
- **图谱**：react-force-graph-2d
- **截图分享**：html2canvas
- **图标**：Lucide Icons
- **PWA**：vite-plugin-pwa
- **Android**：原生 WebView + Gradle 8.2
- **部署**：GitHub Pages
