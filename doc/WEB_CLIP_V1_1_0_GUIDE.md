# TextFlow V1.1.0 网页剪藏功能指导文档

> 目标版本：V1.1.0
> 功能名称：网页剪藏
> 面向用户：普通大众用户
> 存储策略：默认仅本地存储，不上传剪藏内容

---

## 1. 功能定位

网页剪藏是 V1.1.0 的核心新增模块，用于帮助用户在浏览网页时快速保存页面或选中的文字，并自动保留来源信息。

一句话说明：

> 保存当前网页或选中的文字，自动记录来源，方便稍后整理、复制、导出。

该功能应保持 TextFlow 的既有原则：

| 原则 | 设计要求 |
|------|----------|
| 即用即走 | 保存一次剪藏不超过 3 步 |
| 隐私优先 | 剪藏内容默认只写入 `chrome.storage.local` |
| 普通用户优先 | 文案使用“保存”“来源”“备注”“标签”，避免“采集器”“数据结构”等技术表达 |
| 轻量实现 | 第一版不做云同步、全文快照、复杂知识库或多级目录 |

---

## 2. MVP 范围

V1.1.0 必须实现：

1. 收藏当前页面
   - 保存页面标题、URL、域名、收藏时间。
   - 无选中文本时默认进入当前页面收藏模式。

2. 剪藏选中文本
   - 保存用户选中的文字。
   - 自动关联来源页面标题、URL、域名、保存时间。
   - 有选中文本时默认进入选中内容剪藏模式。

3. 标签和备注
   - 标签为可选文本输入，第一版可用逗号分隔。
   - 备注为可选短文本。

4. 最近剪藏列表
   - Popup 内展示最近 5 条。
   - 每条支持复制内容、打开来源、删除。

5. 导出剪藏
   - 支持导出全部剪藏为 `.md`。
   - 支持导出全部剪藏为 `.txt`。

6. 右键菜单
   - 选中文字时提供“保存到网页剪藏”入口。

V1.1.0 不做：

| 不做项 | 原因 |
|--------|------|
| 完整网页离线快照 | 容量大，页面还原复杂，隐私风险更高 |
| 云同步 | 引入账号、权限、服务端和合规成本 |
| 自动抓取全文长期保存 | 容易超出普通用户可理解范围，也增加版权和隐私风险 |
| 多级文件夹 | 第一版用标签即可，避免管理成本过高 |
| AI 摘要 | 需要远程模型或本地模型能力，和当前隐私承诺不一致 |

---

## 3. 用户流程

### 3.1 收藏当前页面

1. 用户打开任意普通网页。
2. 点击 TextFlow 图标。
3. 点击“网页剪藏”。
4. 面板显示当前页面标题和 URL。
5. 用户可填写标签、备注，也可直接点击“保存剪藏”。

成功反馈：

```text
已保存到网页剪藏
```

### 3.2 保存选中文本

1. 用户在网页中选中一段文字。
2. 点击 TextFlow 图标或使用右键菜单“保存到网页剪藏”。
3. 面板自动显示选中文本预览和来源网页。
4. 用户点击“保存剪藏”。

成功后最近剪藏列表立即刷新。

### 3.3 管理最近剪藏

每条最近剪藏提供：

| 操作 | 行为 |
|------|------|
| 复制 | 复制剪藏正文；如果正文为空则复制标题和 URL |
| 打开 | 新标签页打开来源 URL |
| 删除 | 从本地剪藏列表删除该条记录 |

删除前第一版可直接删除并 toast 提示，不强制二次确认。完整剪藏库或批量删除再增加确认。

---

## 4. UI 设计

### 4.1 首页工具卡片

新增工具卡片：

```html
<div class="tool-card webclip" data-tool="webclip" id="cardWebClip">
  <div class="card-icon">🔖</div>
  <div class="card-name" data-i18n="tools.webclip.name">网页剪藏</div>
  <div class="card-desc" data-i18n="tools.webclip.desc">保存页面或选中文本，保留来源链接</div>
</div>
```

### 4.2 详情页结构

建议结构：

```text
网页剪藏

[选中内容] [当前页面]

来源
网页标题
example.com

剪藏内容
选中文本或页面 URL 预览

标签
[学习, 资料]

备注
[添加备注，可选]

[保存剪藏]

最近剪藏
- 标题 / 内容前两行
  example.com · 今天 14:20
  [复制] [打开] [删除]

[导出 Markdown] [导出 TXT]
```

### 4.3 状态文案

| 状态 | 文案 |
|------|------|
| 正在读取 | 正在读取页面信息… |
| 无法读取 | 无法访问当前页面，请检查是否在普通网页上 |
| 保存成功 | 已保存到网页剪藏 |
| 删除成功 | 已删除剪藏 |
| 复制成功 | 已复制到剪贴板 |
| 无剪藏 | 暂无剪藏，保存页面或选中文字后会显示在这里 |

---

## 5. 数据设计

### 5.1 Storage Key

新增：

```javascript
saved_clips
```

### 5.2 数据结构

```json
{
  "id": "clip_1720000000000",
  "type": "selection",
  "title": "网页标题",
  "url": "https://example.com/article",
  "domain": "example.com",
  "text": "用户选中的文本，或页面标题摘要",
  "note": "用户备注",
  "tags": ["学习", "资料"],
  "created_at": "2026-07-05T10:00:00.000Z",
  "updated_at": "2026-07-05T10:00:00.000Z"
}
```

字段说明：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | string | 是 | `clip_` + 时间戳 |
| `type` | string | 是 | `page` 或 `selection` |
| `title` | string | 是 | 页面标题，失败时可使用域名 |
| `url` | string | 是 | 来源 URL |
| `domain` | string | 是 | 来源域名 |
| `text` | string | 否 | 选中文本；页面收藏可为空或存标题摘要 |
| `note` | string | 否 | 用户备注 |
| `tags` | array | 否 | 标签数组 |
| `created_at` | string | 是 | ISO 时间 |
| `updated_at` | string | 是 | ISO 时间 |

### 5.3 限制

| 限制 | 建议值 |
|------|--------|
| 最大条数 | 200 条 |
| 单条正文长度 | 10,000 字符 |
| 备注长度 | 500 字符 |
| 标签数量 | 最多 10 个 |
| 单个标签长度 | 20 字符 |

超过限制时，应给出明确提示。正文超过限制时可以截断保存，但必须提示：

```text
内容较长，已保存前 10000 个字符
```

---

## 6. 架构接入

### 6.1 新增文件

```text
tools/webclip.js
```

职责：

- 获取当前页面信息和选中文本。
- 组装剪藏数据。
- 调用 `StorageManager` 保存、读取、删除剪藏。
- 提供复制、导出 Markdown、导出 TXT 方法。

建议导出全局模块：

```javascript
var WebClipTool = (function () {
  'use strict';

  function loadContext() {}
  function saveClip(payload) {}
  function getRecentClips(limit) {}
  function deleteClip(id) {}
  function copyClip(id) {}
  function exportMarkdown() {}
  function exportText() {}

  return {
    loadContext: loadContext,
    saveClip: saveClip,
    getRecentClips: getRecentClips,
    deleteClip: deleteClip,
    copyClip: copyClip,
    exportMarkdown: exportMarkdown,
    exportText: exportText
  };
})();
```

### 6.2 修改 `utils/core.js`

新增 storage key：

```javascript
SAVED_CLIPS: 'saved_clips'
```

新增默认值：

```javascript
saved_clips: []
```

新增方法：

```javascript
function addClip(clip) {}
function getClips() {}
function deleteClip(id) {}
function clearClips() {}
```

排序规则：

- `getClips()` 返回时按 `created_at` 倒序。
- `addClip()` 写入后保留最新 200 条。

### 6.3 修改 `content.js`

优先复用现有能力：

- `getSelection`
- `getPageInfo`

如果现有 `getPageInfo` 不返回 URL、domain、title，则补齐：

```javascript
{
  title: document.title || location.hostname,
  url: location.href,
  domain: location.hostname
}
```

不需要注入页面 DOM，也不修改网页内容。

### 6.4 修改 `popup.html`

新增：

- 首页卡片 `cardWebClip`
- 详情视图 `viewWebClip`
- 保存按钮、标签输入、备注输入、最近剪藏列表、导出按钮

### 6.5 修改 `popup.js`

需要接入：

| 位置 | 修改 |
|------|------|
| `moduleLoaded` | 增加 `webclip: false` |
| `srcMap` | 增加 `webclip: 'tools/webclip.js'` |
| `cacheDOM()` | 缓存 `viewWebClip`、`cardWebClip`、表单和列表元素 |
| `viewTitleKeys` | 增加 `webclip: 'tools.webclip.name'` |
| `showView()` | 增加 `webclip: dom.viewWebClip` |
| `homeViewInit()` | 绑定网页剪藏卡片点击 |
| 新函数 | 增加 `webClipViewInit()` 和 `renderWebClipList()` |

### 6.6 修改 `background.js`

新增右键菜单：

```javascript
chrome.contextMenus.create({
  id: 'saveWebClipSelected',
  title: I18n.t('context_menu.save_webclip'),
  contexts: ['selection']
});
```

点击后：

1. 调用 content script 获取选中文本。
2. 获取页面 title、url、domain。
3. 写入 `saved_clips`。
4. 打开 popup 或设置 `lastWebClipSaved` 供 popup 展示反馈。

### 6.7 修改 `options.js`

`FEATURE_BLOCKS` 增加：

```javascript
{ id: 'webclip', icon: '🔖', color: 'blue', i18nKey: 'settings.feature_webclip', defaultName: '网页剪藏' }
```

---

## 7. 国际化文案

### 7.1 `locales/zh.json`

```json
"webclip": {
  "name": "网页剪藏",
  "desc": "保存页面或选中文本，保留来源链接",
  "title": "🔖 网页剪藏",
  "mode_selected": "选中内容",
  "mode_page": "当前页面",
  "label_source": "来源",
  "label_content": "剪藏内容",
  "label_tags": "标签",
  "label_note": "备注",
  "placeholder_tags": "例如：学习, 资料",
  "placeholder_note": "添加备注，可选",
  "btn_save": "保存剪藏",
  "btn_copy": "复制",
  "btn_open": "打开",
  "btn_delete": "删除",
  "btn_export_md": "导出 Markdown",
  "btn_export_txt": "导出 TXT",
  "recent_title": "最近剪藏",
  "empty": "暂无剪藏，保存页面或选中文字后会显示在这里",
  "status_loading": "正在读取页面信息…",
  "status_saved": "已保存到网页剪藏",
  "status_deleted": "已删除剪藏",
  "status_failed": "保存失败",
  "toast_copy_success": "已复制到剪贴板",
  "toast_export_started": "导出已开始",
  "toast_too_long": "内容较长，已保存前 10000 个字符"
}
```

### 7.2 `context_menu`

```json
"save_webclip": "保存到网页剪藏"
```

### 7.3 `settings`

```json
"feature_webclip": "网页剪藏"
```

英文文案需同步添加到 `locales/en.json`，然后运行：

```bash
node scripts/generate_locales.js
```

---

## 8. 导出格式

### 8.1 Markdown

```md
# 我的网页剪藏

## 网页标题

来源：https://example.com/article
时间：2026-07-05 18:30
标签：学习, 资料

剪藏内容……
```

### 8.2 TXT

```text
网页标题
来源：https://example.com/article
时间：2026-07-05 18:30
标签：学习, 资料

剪藏内容……
```

文件名建议：

```text
textflow-clips-YYYY-MM-DD.md
textflow-clips-YYYY-MM-DD.txt
```

---

## 9. 验收标准

| ID | 验收项 | 预期结果 |
|----|--------|----------|
| WC-01 | 未选中文本时打开网页剪藏 | 默认显示当前页面收藏模式 |
| WC-02 | 选中文本时打开网页剪藏 | 默认显示选中内容剪藏模式 |
| WC-03 | 保存剪藏 | 数据写入 `saved_clips`，刷新 popup 后仍存在 |
| WC-04 | 最近剪藏 | 最近 5 条按保存时间倒序展示 |
| WC-05 | 复制剪藏 | 剪藏正文成功复制到剪贴板 |
| WC-06 | 打开来源 | 新标签页打开来源 URL |
| WC-07 | 删除剪藏 | 本地记录删除，列表刷新 |
| WC-08 | 导出 Markdown | 下载 `.md` 文件，内容包含标题、来源、时间、标签、正文 |
| WC-09 | 导出 TXT | 下载 `.txt` 文件，内容包含标题、来源、时间、标签、正文 |
| WC-10 | 右键保存 | 选中文字后可通过右键菜单保存到网页剪藏 |
| WC-11 | 工具启用/禁用 | 在设置页禁用后，首页卡片不显示 |
| WC-12 | 隐私 | 保存、复制、删除、导出均不向后端发送剪藏内容 |

---

## 10. 推荐实施顺序

第一阶段：

1. 在 `utils/core.js` 增加 `saved_clips` 存储方法。
2. 新增 `tools/webclip.js`。
3. 在 `popup.html` / `popup.js` 增加网页剪藏详情页。
4. 增加中英文 i18n 文案。

第二阶段：

1. 增加最近剪藏列表操作：复制、打开、删除。
2. 增加导出 Markdown / TXT。
3. 增加 `options.js` 功能块管理。

第三阶段：

1. 增加右键菜单“保存到网页剪藏”。
2. 补齐边界处理：超长文本、无权限页面、空标题、重复保存。
3. 完成回归验证。

---

## 11. 验证建议

基础检查：

```bash
node scripts/generate_locales.js
node -e "for (const f of ['manifest.json','locales/en.json','locales/zh.json','_locales/en/messages.json','_locales/zh_CN/messages.json']) JSON.parse(require('fs').readFileSync(f,'utf8')); console.log('JSON OK')"
```

手动验证页面：

| 场景 | 建议页面 |
|------|----------|
| 普通文章页 | 新闻、博客、文档类网页 |
| 选中文本 | 任意可选择正文页面 |
| 无权限页面 | `chrome://extensions/` |
| 长文本 | 长文章页面 |
| 中英文混合 | 双语文章或技术文档 |

回归关注：

- Popup 首屏加载速度不应明显变慢。
- 未使用网页剪藏时，不应主动加载额外重逻辑。
- 右键菜单语言切换后应同步刷新。
- 设置页禁用 `webclip` 后首页卡片应隐藏。
