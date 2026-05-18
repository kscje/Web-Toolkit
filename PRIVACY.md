# Privacy Policy / 隐私政策

**Effective Date / 生效日期**: 2026-05-17

## English

### 1. Introduction

TextFlow ("this extension" or "we") values your privacy highly. This Privacy Policy explains how this extension collects, uses, stores, and protects your information. By using this extension, you agree to the terms of this policy.

### 2. Data Collection Scope

This extension follows the **principle of least privilege** and **privacy-by-design**. All core feature data processing occurs entirely within your local browser.

**Information we collect:**

- **User Preferences**: Language selection (Chinese/English), feature block enable/disable states, and display order. This information is stored only in your local browser storage (`chrome.storage.local`).
- **User Suggestions**: Feature suggestions you voluntarily submit, along with the current page title and domain (used solely to understand feature request contexts). Suggestion data is stored locally and submitted to our backend server via an encrypted channel.

**Information we do NOT collect:**

- Your browsing history
- Full web page content you visit (unless you actively select and trigger tool processing)
- Your personal identity information (name, email, account details)
- Your IP address, device identifiers, or geolocation
- Any passwords, payment information, or other sensitive data

### 3. Purpose of Data Use

| Data Type | Purpose | Storage Location |
|-----------|---------|-----------------|
| Language preference | Display interface in selected language | Local browser |
| Feature block states | Control visibility of each tool | Local browser |
| Feature block order | Customize tool panel layout | Local browser |
| User suggestions | Improve product feature prioritization | Local + backend server |

### 4. Data Storage and Security

- **Local Storage**: All preferences are stored using Chrome's standard `chrome.storage.local` API. Data remains on your device only and is not automatically synced to any cloud service.
- **Suggestion Submission**: User suggestions are sent via HTTPS encrypted channels to Cloudflare Workers edge servers and stored in a D1 database. The submission process uses Token authentication to prevent unauthorized access.
- **Data Retention**: Local suggestions are capped at 50 entries, with oldest data automatically cleaned when exceeded. Server-side suggestion data is used solely for product improvement analysis and never for commercial purposes.
- **No Third-Party Sharing**: We do not sell, rent, or share your data with any third-party advertisers, data brokers, or external organizations.

### 5. User Rights (GDPR/CCPA Compliance)

Under GDPR, CCPA, and other privacy regulations, you have the following rights:

- **Right to be informed**: Understand data processing through this policy
- **Right of access**: View locally stored preferences via the extension settings page
- **Right to rectification**: Modify your preferences at any time
- **Right to erasure**: Uninstall the extension to clear all locally stored data
- **Right to withdraw consent**: Stop using this extension at any time

### 6. Children's Privacy

This extension is not directed at children under 13. We do not knowingly collect personal information from children.

### 7. Policy Updates

We may update this Privacy Policy from time to time. Any significant changes will be communicated through the Chrome Web Store update notes when the extension is updated.

### 8. Contact Us

If you have any questions, suggestions, or complaints about this Privacy Policy, please contact us:

- **Developer Email**: textflow@example.com
- **Feedback**: Submit via the "Suggest a feature" entry at the bottom of the extension popup

### 9. Compliance Statement

This extension strictly complies with:

- Chrome Web Store Developer Program Policies
- Google Privacy Policy requirements
- GDPR (General Data Protection Regulation)
- CCPA (California Consumer Privacy Act)

---

## 中文

### 1. 引言

TextFlow（文本工具箱）（以下简称"本扩展"或"我们"）高度重视用户的隐私保护。本隐私政策旨在透明地说明本扩展如何收集、使用、存储和保护您的信息。使用本扩展即表示您同意本政策的条款。

### 2. 数据收集范围

本扩展遵循**最小权限原则**和**隐私优先设计**，核心功能的数据处理完全在您的本地浏览器中完成。

**我们收集的信息：**

- **用户偏好设置**：语言选择（中文/English）、功能块启用/禁用状态、功能块显示顺序。这些信息仅存储在您的本地浏览器存储空间（`chrome.storage.local`）中。
- **用户建议反馈**：您主动提交的功能建议内容，以及当前页面的标题和域名（仅用于了解功能需求场景）。建议数据同时存储在本地和通过加密通道提交至我们的后端服务器。

**我们不收集的信息：**

- 您的浏览历史记录
- 您访问的网页完整内容（除非您主动选中并触发工具处理）
- 您的个人身份信息（姓名、邮箱、账号等）
- 您的 IP 地址、设备标识符或地理位置信息
- 任何密码、支付信息或其他敏感数据

### 3. 数据使用目的

| 数据类型 | 使用目的 | 存储位置 |
|---------|---------|---------|
| 语言偏好 | 显示对应语言的界面文案 | 本地浏览器 |
| 功能块状态 | 控制各工具的显示与隐藏 | 本地浏览器 |
| 功能块顺序 | 自定义工具面板布局 | 本地浏览器 |
| 用户建议 | 改进产品功能优先级 | 本地 + 后端服务器 |

### 4. 数据存储与安全

- **本地存储**：所有偏好设置使用 Chrome 扩展标准的 `chrome.storage.local` API 存储，数据仅保存在您的设备上，不会自动同步到任何云端。
- **建议提交**：用户建议通过 HTTPS 加密通道发送至 Cloudflare Workers 边缘服务器，存储于 D1 数据库中。提交过程使用 Token 认证，防止未授权访问。
- **数据保留**：本地建议最多保留 50 条，超出后自动清理最早的数据。服务器端建议数据仅用于产品改进分析，不做任何商业用途。
- **无第三方共享**：我们不会将您的任何数据出售、出租或共享给任何第三方广告商、数据经纪商或其他外部机构。

### 5. 用户权利（GDPR/CCPA 合规）

根据 GDPR 和 CCPA 等隐私法规，您享有以下权利：

- **知情权**：通过本政策了解数据处理情况
- **访问权**：通过扩展的设置页面查看本地存储的偏好设置
- **更正权**：随时修改您的偏好设置
- **删除权**：卸载扩展即可清除所有本地存储数据
- **撤回同意权**：随时停止使用本扩展

### 6. 儿童隐私

本扩展不面向 13 岁以下儿童。我们不会故意收集儿童的个人信息。

### 7. 政策更新

我们可能会不时更新本隐私政策。任何重大变更将在扩展更新时通过 Chrome Web Store 的更新说明告知用户。

### 8. 联系我们

如果您对本隐私政策有任何疑问、建议或投诉，请通过以下方式联系我们：

- **开发者邮箱**：textflow@example.com
- **问题反馈**：通过扩展弹窗底部的"想要新功能？"建议入口提交

### 9. 合规声明

本扩展严格遵守：

- Chrome Web Store 开发者计划政策
- Google 隐私权政策要求
- GDPR（欧盟通用数据保护条例）
- CCPA（加州消费者隐私法案）
