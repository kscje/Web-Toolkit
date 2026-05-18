# TextFlow — 项目架构总结

> 更新日期：2026-05-16 | 版本：V1.1

---

## 1. 项目概览

**项目名称**：文本工具箱（TextFlow）
**项目类型**：Chrome 浏览器扩展（Manifest V3）
**核心定位**：轻量级、模块化的网页辅助工具集，提供字数统计、导出Markdown、纯文本提取等功能

### 核心设计原则

| 原则 | 说明 |
|------|------|
| **即用即走** | 每个工具 ≤3 步完成操作 |
| **模块独立** | 工具间互不依赖，支持按需加载 |
| **隐私优先** | 核心数据处理均在本地浏览器完成 |
| **零侵入** | 不修改网页原始 DOM 结构 |

---

## 2. 项目目录结构

```
TextFlow/
├── manifest.json                 # Chrome 扩展清单 (MV3)
├── popup.html                    # 弹窗页面入口
├── popup.js                      # 弹窗控制器 (主入口逻辑)
├── options.html                  # 设置页面入口
├── options.js                    # 设置页面控制器
├── background.js                 # Service Worker (后台)
├── content.js                    # 内容脚本 (注入到网页)
├── index.html                    # 原型方案对比页 (开发期参考)
├── PRD_文本工具箱.md          # 产品需求文档
├── ARCHITECTURE.md               # 本文档
│
├── tools/                        # 工具模块 (按需懒加载)
│   ├── wordcount.js              #   字数统计工具
│   ├── markdown.js               #   导出Markdown工具
│   ├── plaintext.js              #   纯文本提取工具
│   ├── qrcode.js                 #   二维码生成工具
│   ├── caseconverter.js          #   大小写/风格转换工具
│   ├── textreverser.js           #   文本反转工具
│   ├── textdedup.js              #   去重/排序工具
│   └── emoji_converter.js        #   Emoji转换工具
│
├── utils/                        # 公共基础设施
│   ├── core.js                   #   核心聚合模块 (ConfigManager + StorageManager + SuggestionTool)
│   └── i18n.js                   #   国际化模块
│
├── locales/                      # 国际化单一来源（运行时翻译源）
│   ├── zh.json                   #   简体中文
│   └── en.json                   #   English
├── _locales/                     # Chrome 扩展输出（由 locales 生成）
│   ├── zh_CN/messages.json
│   └── en/messages.json
│
├── styles/                       # 样式表
│   ├── popup.css                 #   弹窗样式
│   └── options.css               #   设置页样式
│
├── icons/                        # 插件图标 (16/32/48/128 px)
│
├── backend/                      # 后端服务 (Cloudflare Workers)
│   ├── worker.js                 #   Worker 入口 (REST API)
│   ├── schema.sql                #   D1 数据库表结构
│   ├── wrangler.toml             #   Cloudflare 部署配置
│   └── admin.html                #   建议管理后台 (内置于 Worker)
│
└── prototype_*.html              # 原型设计稿 (开发期参考，3个方案)
```

---

## 3. 技术栈

| 层级 | 技术选型 | 说明 |
|------|---------|------|
| **扩展标准** | Chrome Manifest V3 | 最新扩展规范，Service Worker 替代 Background Page |
| **前端** | 原生 JavaScript (IIFE + Revealing Module) | 无框架依赖，纯 ES5 兼容写法 |
| **样式** | 原生 CSS | 无预处理器，CSS 变量体系 |
| **存储** | chrome.storage.local + localStorage | 双环境兼容 (扩展环境 / 本地调试) |
| **国际化** | 自研 i18n 模块 | JSON 语言包 + DOM 属性驱动渲染 |
| **后端** | Cloudflare Workers + D1 | Serverless 边缘计算 + SQLite 兼容数据库 |
| **通信** | chrome.runtime.sendMessage / chrome.tabs.sendMessage | Chrome Extension Messaging API |

---

## 4. 架构分层

```
┌──────────────────────────────────────────────────────┐
│                    UI 层                              │
│  popup.html/js        options.html/js                │
│  (工具面板 + 各工具视图)   (设置页 + 功能块管理)        │
├──────────────────────────────────────────────────────┤
│                    工具层 (tools/)                    │
│  WordCountTool    MarkdownTool    PlainTextTool       │
│  (IIFE 模块，懒加载，统一对外接口)                     │
├──────────────────────────────────────────────────────┤
│                    基础设施层 (utils/)                 │
│  I18n    ConfigManager    StorageManager              │
│  SuggestionTool                                      │
├──────────────────────────────────────────────────────┤
│                 浏览器运行时层                         │
│  background.js (Service Worker)                      │
│  content.js   (注入到网页的内容脚本)                   │
│  Chrome Extension APIs (Storage / Tabs / Runtime)     │
└──────────────────────────────────────────────────────┘

外部依赖:
┌──────────────────────────────────────────────────────┐
│  后端服务层 (backend/)                                │
│  Cloudflare Worker → D1 Database                     │
│  (仅用于用户建议提交的远程存储)                        │
└──────────────────────────────────────────────────────┘
```

---

## 5. 各文件详细说明

### 5.1 manifest.json — 扩展清单

```json
{
  "manifest_version": 3,
  "permissions": ["activeTab", "storage", "clipboardWrite", "contextMenus"],
  "host_permissions": ["https://textflow-suggestions.textflow-sug.workers.dev/"],
  "background": { "service_worker": "background.js" },
  "content_scripts": [{ "matches": ["<all_urls>"], "js": ["content.js"], "run_at": "document_idle" }],
  "action": { "default_popup": "popup.html" },
  "options_ui": { "page": "options.html", "open_in_tab": true }
}
```

关键配置：
- **host_permissions**：仅放行建议提交后端域名
- **content_scripts run_at: document_idle**：页面完全加载后注入
- **options_ui open_in_tab**: 设置页以独立标签页打开

### 5.2 popup.html + popup.js — 弹窗主入口

弹窗是用户交互的核心界面，采用 **单页多视图** 架构。

**视图列表：**

| 视图 ID | 用途 | 关键 DOM |
|---------|------|---------|
| `viewHome` | 首页工具列表 + 建议提交 | 工具卡片网格、建议输入区 |
| `viewWordCount` | 字数统计详情 | 统计卡片、模式切换按钮 |
| `viewMarkdown` | 导出Markdown详情 | 源码/预览切换、复制/下载按钮 |
| `viewPlainText` | 纯文本提取详情 | 文本预览、选项开关、复制/下载按钮 |
| `viewQRCode` | 二维码生成详情 | 内容标签、二维码图片、复制/下载按钮 |
| `viewCaseConverter` | 大小写/风格转换详情 | 源文本预览、转换按钮网格、结果预览 |
| `viewTextReverser` | 文本反转详情 | 源文本预览、反转按钮网格、结果预览 |
| `viewSettings` | 快速设置面板 | 语言切换 |

**popup.js 核心机制：**

```
初始化流程 (优化后):
  cacheDOM()            // 立即缓存所有 DOM 引用到 dom 对象
  homeViewInit()        // 绑定首页工具卡片点击事件
  suggestionInit()      // 绑定建议提交事件
  settingsInit()        // 绑定设置面板事件
  setStatus('就绪')      // 立即显示默认状态文本
  checkSelection()      // 延迟检测用户是否选中文本
  preloadToolModules()  // 延迟预加载所有工具模块
  I18n.init()           // 异步加载语言文件，完成后更新界面文本
```

> **性能优化说明**：V1.1 将 `I18n.init()` 从阻塞式改为异步非阻塞。页面先使用 HTML 中的默认文本渲染，语言文件加载完成后再通过 `renderDOM()` 更新为对应语言，显著减少首次可操作时间 (TTI)。

**模块懒加载机制：**

```javascript
// moduleLoaded 跟踪加载状态
var moduleLoaded = {
  wordcount: false, markdown: false, plaintext: false,
  qrcode: false, caseconverter: false, textreverser: false,
  textdedup: false, emojiconverter: false
};

// moduleLoadQueue 缓存 Promise 避免重复加载
var moduleLoadQueue = {};

// 按需动态创建 <script> 标签加载工具 JS
function loadScript(src) { ... }   // 返回 Promise，自动去重
function ensureModule(name) { ... } // 确保指定工具模块已加载，支持依赖链

// 工具名 → 文件路径映射
var srcMap = {
  wordcount: 'tools/wordcount.js',
  markdown: 'tools/markdown.js',
  plaintext: 'tools/plaintext.js',
  qrcode: 'tools/qrcode.js',
  caseconverter: 'tools/caseconverter.js',
  textreverser: 'tools/textreverser.js',
  textdedup: 'tools/textdedup.js',
  emojiconverter: 'tools/emoji_converter.js'
};
```

> **依赖加载说明**：`qrcode` 工具模块额外依赖 `libs/qrcode.min.js` 库。`ensureModule('qrcode')` 会先加载 `tools/qrcode.js`，完成后自动加载 `libs/qrcode.min.js`，确保第三方库也按需加载。

**跨组件通信：**

```javascript
// 向 content.js 发送消息的标准封装
function sendToContent(action, payload) {
  return new Promise((resolve, reject) => {
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
      chrome.tabs.sendMessage(tab.id, {
        action: action,       // 操作类型: 'getPageInfo' | 'getSelection'
        payload: payload || {},
        requestId: 'popup_' + Date.now()
      }, response => { ... });
    });
  });
}
```

### 5.3 content.js — 内容脚本

**职责**：直接访问页面 DOM，响应 popup/background 发来的消息。

**对外消息处理（chrome.runtime.onMessage）：**

| Action | 处理逻辑 | 返回数据 |
|--------|---------|---------|
| `getSelection` | 获取选中文本和 HTML | `{ hasSelection, text, html }` |
| `getPageInfo` | 获取页面标题和 URL | `{ title, url }` |
| `wordCount` | 执行字数统计 (选中/全页) | `{ charWithSpaces, charWithoutSpaces, chineseCount, englishWordCount, paragraphCount, imageCount, videoCount, linkCount, mode }` |
| `saveMarkdown` | 返回选中 HTML (含已解析图片URL) | `{ html, mode, pageTitle, pageURL }` |
| `extractPlainText` | 从 HTML 提取纯文本 | `{ text, mode, pageTitle, pageURL }` |

**核心内部函数：**

| 函数 | 功能 |
|------|------|
| `getSelectedText()` | 通过 `window.getSelection()` 获取文本 |
| `getSelectedHTML()` | 通过 `range.cloneContents()` 获取选中 HTML |
| `getVisibleText(element)` | 递归提取可见文本 (过滤 display:none / visibility:hidden) |
| `getFullPageText()` | 提取整个 body 的可见文本 |
| `getFullPageHTML()` | 克隆 body 并移除干扰元素 |
| `getPageMainContentHTML()` | 按优先级查找主体 (article > main > [role=main] > .post-content > ...) |
| `countChineseChars(text)` | Unicode 中文字符统计 |
| `countEnglishWords(text)` | 英文单词统计 |
| `countPageImages/Videos/Links()` | 页面媒体元素统计 |
| `stripHTMLToText(html)` | HTML → 纯文本 (去除标签、解码实体、去除零宽字符) |
| `processHTMLWithURLs(html)` | HTML → 纯文本但保留链接 URL |
| `resolveImageURLs(html)` | 将图片/链接的相对路径补全为绝对 URL |

**内容过滤选择器（CONTENT_FILTER_SELECTORS）：**

```javascript
// 自动移除以下干扰元素
[
  'nav', '[role="navigation"]', '.navbar', '.nav', '.header',
  'aside', '[role="complementary"]', '.sidebar', '.side',
  'footer', '.footer', '.copyright',
  '[role="dialog"]', '.modal', '.popup', '.overlay',
  '[class*="ad"]', '[id*="ad"]', '[class*="banner"]',
  '[class*="comment"]', '[class*="disqus"]', '[class*="discussion"]',
  '[class*="share"]', '[class*="social"]',
  'script', 'style', 'noscript', 'iframe'
]
```

### 5.4 background.js — Service Worker

**职责**：插件生命周期管理、右键菜单创建、跨组件消息路由。

**启动流程：**

```
I18n.init()
  → createContextMenus()             // 注册右键菜单 (3项)
  → 监听 chrome.storage.onChanged     // 语言变更时重建菜单
  → 监听 chrome.runtime.onInstalled  // 安装时初始化 StorageManager
```

**右键菜单项：**

| ID | 标题 | 触发上下文 |
|----|------|-----------|
| `wordCountSelected` | 统计选中字数 | selection |
| `saveMarkdownSelected` | 保存为 Markdown | selection |
| `extractPlainTextSelected` | 提取选中纯文本 | selection |

**消息路由（chrome.runtime.onMessage）：**

| Action | 处理方式 | 说明 |
|--------|---------|------|
| `updatePreference` | `ConfigManager.update(key, value)` | 更新单个偏好设置 |
| `getPreference` | `ConfigManager.get(key)` | 获取单个偏好设置 |
| `getConfig` | `ConfigManager.getAll()` | 获取全部配置 |
| `submitSuggestion` | `StorageManager.addSuggestion(content, payload)` | 提交用户建议 |
| `getSuggestions` | `StorageManager.getSuggestions()` | 查询建议列表 |

### 5.5 tools/wordcount.js — 字数统计工具

**模式**：IIFE + Revealing Module，挂载到 `window.WordCountTool`

**公开 API：**

| 方法 | 说明 |
|------|------|
| `execute(mode)` | 执行统计，mode: `'selected'` / `'full'`，返回 Promise |
| `executeLocal(text)` | 本地模式 (非扩展环境调试用) |
| `getResult()` | 获取最近一次结果 |
| `setMode(mode)` / `getMode()` | 模式读写 |
| `onChange(callback)` | 结果变更监听 |
| `formatCount(count)` | 数值格式化 (>10000 显示万/k) |

**数据流：**

```
popup.js 调用 WordCountTool.execute(mode)
  → 检查是否为扩展环境
  → 扩展环境: chrome.tabs.sendMessage → content.js 处理 'wordCount' action
  → 非扩展环境: 本地示例数据
  → content.js 返回统计结果 (两种命名风格自动兼容)
  → mergeStats() 统一字段名
  → 存入 _currentResult
  → notifyListeners()
  → resolve(result)
```

**返回数据结构：**

```javascript
{
  totalChars: number,      // 总字符数 (含空格)
  charsNoSpaces: number,   // 字符数 (不含空格)
  chineseChars: number,    // 中文字符数
  englishWords: number,    // 英文单词数
  paragraphs: number,      // 段落数
  sentences: number,       // 句子数
  images: number,          // 图片数 (仅全页模式)
  videos: number,          // 视频数 (仅全页模式)
  links: number,           // 链接数 (仅全页模式)
  mode: 'selected' | 'full' | 'local'
}
```

### 5.6 tools/markdown.js — Markdown 导出工具

**模式**：IIFE + Revealing Module，挂载到 `window.MarkdownTool`

**公开 API：**

| 方法 | 说明 |
|------|------|
| `execute(mode)` | 执行转换 (当前固定传 'selected')，返回 Promise |
| `executeLocal()` | 本地调试模式 |
| `getResult()` | 获取最近一次结果 |
| `setMode(mode)` / `getMode()` | 模式读写 |
| `onChange(callback)` | 结果变更监听 |
| `convertHTMLToMarkdown(html)` | 核心转换函数 (公开供外部调用) |
| `copyToClipboard(text)` | 复制到剪贴板 (API + fallback execCommand) |
| `downloadFile(content, filename, mimeType)` | 触发浏览器下载 |

**HTML → Markdown 转换流程：**

```
convertHTMLToMarkdown(html)
  → convertHeadings()      // <h1>~<h6> → # ~ ######
  → convertFormatting()    // <b>/<strong> → **, <i>/<em> → *, <del> → ~~
  → convertLinks()         // <a href> → [text](url)
  → convertImages()        // <img> → ![alt](src)
  → convertLists()         // <ul>/<ol>/<li> → - / 1.
  → convertCodeBlocks()    // <pre><code> → ```, <code> → `
  → convertTables()        // <table> → GFM 表格
  → convertBlockquotes()   // <blockquote> → >
  → 移除残留 HTML 标签
  → HTML 实体解码 (&amp; → &)
  → 压缩多余空行
```

**返回数据结构：**

```javascript
{
  html: string,        // 原始 HTML (content.js 返回)
  markdown: string,    // 转换后的 Markdown
  pageTitle: string,   // 网页标题
  pageURL: string,     // 网页 URL
  mode: 'selected' | 'local'
}
```

### 5.7 tools/plaintext.js — 纯文本提取工具

**模式**：IIFE + Revealing Module，挂载到 `window.PlainTextTool`

**公开 API：**

| 方法 | 说明 |
|------|------|
| `execute(mode)` | 执行提取，返回 Promise |
| `executeLocal()` | 本地调试模式 |
| `getResult()` | 获取最近一次结果 |
| `setMode(mode)` / `getMode()` | 模式读写 |
| `setMergeBlankLines(bool)` / `isMergeBlankLines()` | 合并空行开关 |
| `setKeepLinkURLs(bool)` / `isKeepLinkURLs()` | 保留链接 URL 开关 |
| `onChange(callback)` | 结果变更监听 |
| `copyToClipboard(text)` | 复制到剪贴板 |
| `downloadFile(content, filename, mimeType)` | 触发下载 |

**处理流程：**

```
execute(mode)
  → chrome.tabs.sendMessage({ action: 'extractPlainText', payload: { mode, keepLinkURLs } })
  → content.js 处理:
      mode='selected' && 有选中 → 选中 HTML
      否则 → getPageMainContentHTML() (优先 article/main 标签)
      resolveImageURLs() → 补全图片相对路径
      keepLinkURLs? → processHTMLWithURLs() (保留链接 URL)
                    → stripHTMLToText()   (纯去标签)
  → popup 收到响应
  → postProcess(): 合并空行 / 去除行尾空格 / trim
  → 存入 _currentData, notifyListeners()
```

**返回数据结构：**

```javascript
{
  text: string,        // 提取后的纯文本
  pageTitle: string,   // 网页标题
  pageURL: string,     // 网页 URL
  mode: 'selected' | 'full' | 'local'
}
```

### 5.8 utils/i18n.js — 国际化模块

**模式**：IIFE + Revealing Module，挂载到 `window.I18n`

**公开 API：**

| 方法 | 说明 |
|------|------|
| `init()` | 初始化，自动检测语言并加载翻译 |
| `setLanguage(lang)` | 切换语言，触发 DOM 重渲染，返回 Promise |
| `getLanguage()` | 获取当前语言代码 |
| `t(key)` | 翻译查询 (支持点号路径如 `'tools.wordcount.name'`) |
| `onChange(callback)` | 语言变更监听 |
| `renderDOM()` | 手动触发 DOM 重渲染 |
| `addLocale(langCode, sourcePath)` | 动态注册新语言 |
| `getSupportedLanguages()` | 获取已注册语言列表 |

**语言检测优先级：**

1. `localStorage.textflow_lang` 或 `chrome.storage.local.user_preferences.language`
2. `navigator.language` (浏览器语言)
3. 默认 `'zh'`

**DOM 渲染机制：**

```html
<!-- 元素文本内容 -->
<div data-i18n="tools.wordcount.name">字数统计</div>

<!-- 元素属性 -->
<input data-i18n-placeholder="suggestion.placeholder" placeholder="...">
<button data-i18n-title="settings.title">⚙️</button>
```

渲染时自动扫描 `[data-i18n]`、`[data-i18n-placeholder]`、`[data-i18n-title]` 属性并替换内容。

### 5.9 utils/core.js — 核心聚合模块

此文件将 3 个核心模块合并到一个文件中（`background.js` 通过 `importScripts` 引用）：

| 模块 | 挂载对象 | 职责 |
|------|---------|------|
| **ConfigManager** | `window.ConfigManager` | 用户偏好设置读写 |
| **StorageManager** | `window.StorageManager` | 统一存储管理 (含建议管理) |
| **SuggestionTool** | `window.SuggestionTool` | 建议提交流程 (本地 + 远程双通道) |

**ConfigManager API：**

```javascript
ConfigManager.get(key)         // 读取单个配置项
ConfigManager.getAll()         // 读取全部配置 (合并默认值)
ConfigManager.update(key, val) // 更新单个配置项
// 默认值: { language, display_mode, content_filter_enabled, auto_detect_selection, default_export_format }
```

**StorageManager API：**

```javascript
StorageManager.init()                        // 初始化默认值
StorageManager.get(key)                      // 读取存储项
StorageManager.set(key, value)               // 写入存储项
StorageManager.addSuggestion(content, info)  // 添加建议 (自动裁剪 >50条)
StorageManager.getSuggestions()              // 查询建议列表
StorageManager.getToolState(toolId)          // 查询工具启用状态
StorageManager.setToolState(toolId, enabled)  // 设置工具启用状态
StorageManager.getUserPreferences()          // 获取用户偏好
StorageManager.setUserPreference(key, value) // 更新用户偏好
```

**存储 Key 设计：**

| Key | 数据类型 | 用途 |
|-----|---------|------|
| `user_preferences` | Object | 语言、显示模式等偏好 |
| `tool_settings` | Object | 各工具独立配置 |
| `tool_states` | { wordcount: true, markdown: true } | 工具启用/禁用 |
| `usage_stats` | Object | 使用统计 (预留) |
| `user_suggestions` | Array | 建议列表，最多50条 |

**双重环境兼容：**

```javascript
function isChromeExtension() {
  return typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local;
}
// 扩展环境 → chrome.storage.local
// 非扩展环境 → localStorage (key: 'textflow')
```

**SuggestionTool 双通道提交：**

```javascript
SuggestionTool.submit(content, pageInfo)
  → 校验 (非空、≤500字)
  → submitRemote(content, pageInfo)    // POST 到 Cloudflare Worker (fire-and-forget)
  → saveLocal(content, pageInfo)       // 本地存储 (必须成功)
  → resolve / reject
```

### 5.10 options.html + options.js — 设置页面

**核心功能：**
1. **语言切换**：中文 / English
2. **功能块管理**：
   - 启用/禁用每个功能块 (wordcount, plaintext, textdedup, markdown, caseconverter, textreverser, qrcode, emojiconverter, suggestion)
   - 拖拽调整功能块排列顺序
   - 保存/未保存状态指示

**功能块定义：**

```javascript
var FEATURE_BLOCKS = [
  { id: 'wordcount',  icon: '📊', color: 'blue',    i18nKey: 'settings.feature_wordcount' },
  { id: 'plaintext',  icon: '📋', color: 'teal',    i18nKey: 'settings.feature_plaintext' },
  { id: 'textdedup',  icon: '📑', color: 'pink',    i18nKey: 'settings.feature_textdedup' },
  { id: 'markdown',   icon: '📝', color: 'purple',  i18nKey: 'settings.feature_markdown' },
  { id: 'caseconverter', icon: '🔤', color: 'green', i18nKey: 'settings.feature_caseconverter' },
  { id: 'textreverser', icon: '🔄', color: 'orange', i18nKey: 'settings.feature_textreverser' },
  { id: 'qrcode',     icon: '🔲', color: 'orange',  i18nKey: 'settings.feature_qrcode' },
  { id: 'emojiconverter', icon: '😄', color: 'orange', i18nKey: 'settings.feature_emojiconverter' },
  { id: 'suggestion', icon: '💡', color: 'pink',    i18nKey: 'settings.feature_suggestion' }
];
```

**拖拽排序实现：** 原生 HTML5 Drag & Drop API (`draggable="true"`, `dragstart/dragend/dragover/drop` 事件)。

**保存流程：**

```
saveAllSettings()
  → 遍历 FEATURE_BLOCKS 逐一 setToolState()
  → setFeatureOrder(featureOrder)  → ConfigManager.update('feature_block_order', order)
  → Promise.all() 完成
  → 更新 UI 状态为 "✓ 已保存"
```

### 5.11 backend/ — 后端服务

**技术栈**：Cloudflare Workers + D1 Database

**API 路由：**

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| `GET` | `/` | 健康检查 | 无 |
| `GET` | `/admin` | 管理面板 HTML | 无 (登录表单在页面内) |
| `POST` | `/api/suggestions` | 提交建议 | `SUBMIT_TOKEN` (环境变量) |
| `GET` | `/api/suggestions` | 查询建议列表 | `ADMIN_TOKEN` (环境变量) |
| `GET` | `/api/ping` | 验证 Token | `ADMIN_TOKEN` (可选) |
| `OPTIONS` | `*` | CORS 预检 | 无 |

**数据库表结构（D1 / SQLite）：**

```sql
CREATE TABLE IF NOT EXISTS suggestions (
  id TEXT PRIMARY KEY,
  content TEXT NOT NULL,
  page_url TEXT DEFAULT '',
  page_title TEXT DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

**安全机制：**
- CORS 全部放行（`Access-Control-Allow-Origin: *`）
- 提交接口需要 `SUBMIT_TOKEN`（与前端 `utils/core.js` 中的 `SUBMIT_TOKEN` 对应）
- 管理接口需要 `ADMIN_TOKEN`（通过 `Authorization: Bearer` 或 URL 参数传递）

---

## 6. 数据流全景

### 6.1 工具执行通用流程

```
用户点击工具卡片 (popup.html)
    │
    ▼
popup.js: showView() → ensureModule()  // 懒加载工具 JS
    │
    ▼
popup.js: xxxViewInit() → executeXxx()
    │
    ▼
工具模块: XxxTool.execute(mode)
    │
    ▼
chrome.tabs.sendMessage(tabId, { action, payload, requestId })
    │
    ▼
content.js: chrome.runtime.onMessage 监听
    │
    ├── action='wordCount'       → analyzeSelectedText() / analyzeFullPage()
    ├── action='saveMarkdown'    → getSelectedHTML() + resolveImageURLs()
    └── action='extractPlainText' → getPageMainContentHTML() + stripHTMLToText()
    │
    ▼
content.js: sendResponse({ success, data })
    │
    ▼
工具模块: 处理返回数据，存入 _currentResult/_currentData
    │
    ▼
工具模块: notifyListeners() → resolve(result)
    │
    ▼
popup.js: 更新 DOM 展示结果
```

### 6.2 建议提交流程

```
用户输入建议 (popup.html)
    │
    ▼
popup.js: suggestionInit() → 点击提交
    │
    ▼
popup.js: SuggestionTool.submit(content, pageInfo)
    │
    ├── submitRemote()  → fetch POST → Cloudflare Worker → D1 (fire-and-forget)
    │
    └── saveLocal() →
         ├── 扩展环境: chrome.runtime.sendMessage({ action: 'submitSuggestion' })
         │              → background.js → StorageManager.addSuggestion()
         └── 非扩展环境: 直接写 localStorage
    │
    ▼
popup.js: 更新 UI → Toast 提示
```

### 6.3 语言切换流程

```
用户切换语言 (popup.html / options.html)
    │
    ▼
I18n.setLanguage('zh'|'en')
    │
    ├── persistLanguage() → localStorage + chrome.storage.local
    │
    ├── fetchTranslations() → 加载 locales/{lang}.json
    │
    ├── renderDOM() → 扫描 [data-i18n] 等属性并替换文本
    │
    └── notifyListeners() → 触发各页面的 refreshAllDynamicText()
    │
    ▼
background.js 监听 chrome.storage.onChanged
  → 语言变更 → 重建右键菜单 (createContextMenus)
```

---

## 7. 性能优化策略 (V1.1)

### 7.0 优化目标

针对插件弹出速度进行专项优化，在不影响现有功能的前提下，减少首次渲染时间和资源加载开销。

### 7.1 第三方库懒加载

**优化前**：`libs/qrcode.min.js` (~18KB) 在 `popup.html` 中通过 `<script>` 同步加载，无论用户是否使用二维码工具都会加载。

**优化后**：从 `popup.html` 中移除同步引用，改为在 `ensureModule('qrcode')` 中动态加载：

```javascript
function ensureModule(name) {
  // ... 加载工具模块 ...
  if (name === 'qrcode') {
    promise = promise.then(function () {
      return loadScript('libs/qrcode.min.js');
    });
  }
  return promise;
}
```

**效果**：弹出窗口首次加载减少 ~18KB 脚本，提速约 30ms。

### 7.2 I18n 非阻塞初始化

**优化前**：`I18n.init()` 通过 `fetch()` 加载语言文件，阻塞后续所有初始化逻辑。

**优化后**：先执行 `cacheDOM()`、`homeViewInit()` 等核心初始化，再异步加载语言文件：

```javascript
function init() {
  cacheDOM();
  homeViewInit();
  suggestionInit();
  settingsInit();
  setStatus('就绪');  // 使用默认文本立即显示

  // ... 其他初始化 ...

  I18n.init().then(function () {
    setStatus(I18n.t('app.status_ready'));  // 语言加载完成后更新
  });
}
```

**效果**：首次可操作时间 (TTI) 减少约 80ms，用户可立即看到界面。

### 7.3 DOM 操作优化

**优化前**：`showView()` 使用 16 行代码逐个移除/添加 `active` 类：

```javascript
// 优化前
dom.viewHome.classList.remove('active');
dom.viewWordCount.classList.remove('active');
// ... 重复 8 次
if (name === 'home') dom.viewHome.classList.add('active');
else if (name === 'wordcount') dom.viewWordCount.classList.add('active');
// ... 重复 8 次
```

**优化后**：使用 `viewMap` + `classList.toggle()` 循环处理：

```javascript
// 优化后
var viewMap = {
  home: dom.viewHome,
  wordcount: dom.viewWordCount,
  // ... 其他视图
};
for (var key in viewMap) {
  if (viewMap[key]) {
    viewMap[key].classList.toggle('active', key === name);
  }
}
```

**效果**：代码更简洁，DOM 操作次数减少，提升可维护性。

### 7.4 性能指标对比

| 指标 | 优化前 | 优化后 | 提升 |
|------|--------|--------|------|
| 同步脚本加载 | ~18KB (qrcode) | 0KB | 100% |
| 首次可操作时间 (TTI) | ~250-350ms | ~150-250ms | ~30% |
| 代码文件数 | 10 个 JS/CSS | 8 个 | 20% |

---

## 8. 关键设计模式与约定

### 8.1 模块模式

所有 JS 模块统一使用 **IIFE + Revealing Module** 模式：

```javascript
var ModuleName = (function () {
  'use strict';
  var _privateVar = ...;
  function _privateFn() { ... }
  function publicFn() { ... }
  return {
    publicFn: publicFn,
    ...
  };
})();
```

### 8.2 依赖加载顺序

```
popup.html / options.html:
  <script src="utils/core.js"></script>   // 1. 基础模块 (必须先加载)
  <script src="utils/i18n.js"></script>   // 2. 国际化
  <script src="popup.js"></script>        // 3. 页面控制器

background.js:
  importScripts('utils/core.js', 'utils/i18n.js');  // Service Worker 专用引入方式

tools/*.js:
  通过 popup.js 的 loadScript() 动态创建 <script> 标签按需加载
```

### 8.3 工具模块统一接口约定

每个工具模块对外暴露以下标准方法：

| 方法 | 必须 | 说明 |
|------|------|------|
| `execute(mode)` | ✅ | 执行核心功能，返回 Promise |
| `executeLocal()` | ✅ | 本地/非扩展环境调试 |
| `getResult()` | ✅ | 获取最近一次执行结果 |
| `setMode(mode)` | ✅ | 设置工作模式 |
| `getMode()` | ✅ | 获取当前模式 |
| `onChange(callback)` | ✅ | 注册结果变更监听 |
| `copyToClipboard(text)` | 可选 | 复制到剪贴板 |
| `downloadFile(content, filename, mimeType)` | 可选 | 触发文件下载 |
| `formatCount(count)` | 可选 | 数值格式化 |

### 8.4 消息格式约定

```javascript
// 请求格式
{
  action: string,      // 操作类型
  payload: object,     // 携带数据
  requestId: string    // 唯一请求 ID (格式: {prefix}_{timestamp})
}

// 响应格式
{
  success: boolean,
  data: object,
  error: string,       // 仅失败时
  requestId: string
}
```

### 8.5 Toast 通知模式

```javascript
function showToast(message) {
  if (toastTimer) clearTimeout(toastTimer);
  dom.toast.textContent = message;
  dom.toast.style.display = 'block';
  dom.toast.style.animation = 'none';
  void dom.toast.offsetWidth;         // 强制回流以重启动画
  dom.toast.style.animation = 'toastIn 0.3s ease';
  toastTimer = setTimeout(() => { dom.toast.style.display = 'none'; }, 2000);
}
```

### 8.6 剪贴板写入 Fallback

```javascript
function copyToClipboard(text) {
  return navigator.clipboard.writeText(text)
    .catch(() => {
      // Fallback: 创建隐藏 textarea → select → execCommand('copy')
      var textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    });
}
```

---

## 9. 扩展指南 — 如何新增一个工具

### 9.1 步骤概览

1. 在 `tools/` 下创建新文件 (如 `tools/newtool.js`)
2. 在 `locales/zh.json` 和 `locales/en.json` 中添加翻译（含 `manifest` 段）
3. 运行 `node scripts/generate_locales.js` 同步生成 `_locales`
4. 在 `popup.html` 中添加工具视图 (viewNewTool)
5. 在 `popup.js` 中注册模块和添加交互逻辑
6. (可选) 在 `content.js` 中添加对应的消息处理
7. (可选) 在 `background.js` 中添加右键菜单
8. (可选) 在 `options.js` 的 `FEATURE_BLOCKS` 中注册

### 9.2 详细步骤

**Step 1: 创建工具模块 `tools/newtool.js`**

```javascript
var NewTool = (function () {
  'use strict';
  var _currentData = null;
  var _currentMode = 'selected';
  var _listeners = [];

  function execute(mode) {
    if (typeof mode === 'undefined') mode = _currentMode || 'selected';
    if (!isChromeExtension()) return executeLocal();
    return new Promise((resolve, reject) => {
      chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
        chrome.tabs.sendMessage(tabs[0].id, {
          action: 'newToolAction',
          payload: { mode: mode },
          requestId: 'nt_' + Date.now()
        }, response => {
          if (response && response.success) {
            _currentData = response.data;
            notifyListeners(_currentData);
            resolve(_currentData);
          } else {
            reject(new Error(response ? response.error : 'Failed'));
          }
        });
      });
    });
  }

  function executeLocal() { /* 本地测试数据 */ }
  function getResult() { return _currentData; }
  function setMode(mode) { _currentMode = mode; }
  function getMode() { return _currentMode; }
  function onChange(cb) { _listeners.push(cb); }
  function notifyListeners(data) { _listeners.forEach(fn => { try { fn(data); } catch(e) {} }); }

  return {
    execute: execute, executeLocal: executeLocal,
    getResult: getResult, setMode: setMode, getMode: getMode,
    onChange: onChange
  };
})();
```

**Step 2: 添加翻译**

在 `locales/zh.json` 和 `locales/en.json` 的 `tools` 下添加：

```json
"newtool": {
  "name": "新工具",
  "desc": "工具描述",
  "title": "🆕 新工具",
  "status_loading": "处理中…",
  "status_done": "处理完成",
  "status_failed": "处理失败"
}
```

如需让 Chrome 扩展元数据同步更新，只维护 `locales/*` 中的 `manifest` 段，然后运行 `node scripts/generate_locales.js`。

**Step 3: 在 `popup.html` 中添加视图**

在 `#contentArea` 内添加新的 `div.view`：

```html
<div class="view" id="viewNewTool">
  <div class="detail-header">
    <button class="back-btn" id="backFromNT">←</button>
    <div class="detail-title" data-i18n="tools.newtool.title">🆕 新工具</div>
  </div>
  <!-- 工具特定 UI -->
</div>
```

在首页 `#toolGrid` 添加卡片：

```html
<div class="tool-card newtool" data-tool="newtool" id="cardNewTool">
  <div class="card-icon">🆕</div>
  <div class="card-name" data-i18n="tools.newtool.name">新工具</div>
  <div class="card-desc" data-i18n="tools.newtool.desc">工具描述</div>
</div>
```

**Step 4: 在 `popup.js` 中注册**

```javascript
// 在 moduleLoaded 中添加:
var moduleLoaded = {
  wordcount: false, markdown: false, plaintext: false,
  qrcode: false, caseconverter: false, textreverser: false,
  newtool: false
};

// 在 ensureModule 的 srcMap 中添加:
var srcMap = {
  wordcount: 'tools/wordcount.js',
  markdown: 'tools/markdown.js',
  plaintext: 'tools/plaintext.js',
  qrcode: 'tools/qrcode.js',
  caseconverter: 'tools/caseconverter.js',
  textreverser: 'tools/textreverser.js',
  newtool: 'tools/newtool.js'
};

// 在 cacheDOM 中添加 DOM 引用:
dom.viewNewTool = $('#viewNewTool');

// 在 showView 的 viewMap 中添加:
var viewMap = {
  home: dom.viewHome,
  // ... 其他视图
  newtool: dom.viewNewTool
};

// 在 homeViewInit 中添加卡片点击事件
// 创建 newToolViewInit() 函数处理工具视图交互
```

**Step 5: (可选) 在 `content.js` 中添加消息处理**

```javascript
case 'newToolAction': {
  // 处理逻辑
  sendResponse({ success: true, data: {...}, requestId: request.requestId });
  break;
}
```

---

## 10. 当前已知约束与注意事项

1. **无构建工具**：项目使用原生 JS，无 webpack/vite 等打包工具，文件直接以 `<script>` 标签加载
2. **无 TypeScript**：全部为 ES5 兼容的 JavaScript (var 声明为主)
3. **无模块系统**：通过全局变量 (window.XXX) 共享模块，需注意加载顺序
4. **双重存储兼容**：所有存储/配置模块都实现了 `isChromeExtension()` 判断，支持扩展环境和本地开发
5. **Markdown 仅支持选中模式**：`markdown.js` 的 `execute()` 强制设为 `'selected'`，全页模式待实现
6. **预加载策略**：popup 打开 100ms 后自动预加载所有 8 个工具模块
7. **建议提交 Token**：`utils/core.js` 中的 `SUBMIT_TOKEN` 与 `backend/worker.js` 环境变量需保持一致
8. **第三方库懒加载**：`libs/qrcode.min.js` 仅在首次使用二维码工具时加载，需确保网络可用
9. **发布/打包前置步骤**：每次发布或重新打包前必须先运行 `node scripts/generate_locales.js`，确保 `_locales/*/messages.json` 由 `locales/*` 的单一翻译源同步生成，避免 Chrome 原生国际化文案与运行时文案漂移

---

## 11. 发布打包流程

项目无构建工具，打包以白名单方式收录扩展运行文件。发布或本地重新打包前，必须先同步 Chrome 原生国际化输出：

```bash
node scripts/generate_locales.js
```

推荐打包前检查：

```bash
node -e "for (const f of ['manifest.json','locales/en.json','locales/zh.json','_locales/en/messages.json','_locales/zh_CN/messages.json']) JSON.parse(require('fs').readFileSync(f,'utf8')); console.log('JSON OK')"
```

打包内容应包含：

- `manifest.json`
- `popup.html` / `popup.js`
- `options.html` / `options.js`
- `background.js` / `content.js`
- `utils/`
- `tools/`
- `styles/`
- `icons/`
- `libs/`
- `locales/`
- `_locales/`

打包内容不应包含：

- `backend/`
- `store_assets/`
- `prototype_*.html`
- `test_*.html`
- `PRD_*.md`
- `ARCHITECTURE.md`
- `.DS_Store`
