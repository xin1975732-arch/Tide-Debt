# 围涂评论功能说明

这个仓库里主页面是单文件阅读器 `index.html`，我没有直接重写整份正文内容，而是采用“增量增强”的方式接入评论：

- `reader-comments.js`
  - 在现有页面中自动识别正文段落
  - 每段增加评论按钮，鼠标悬停可见，移动端使用小图标
  - 低调展示评论数量
  - 侧栏/底部面板支持显示原文、评论、回复和输入框
  - 未配置时显示“评论服务尚未配置”

- `server/server.js`
  - 可运行的真实后端示例
  - 使用 SQLite 保存评论，按 `bookId + chapterId + paragraphId` 做隔离
  - 管理入口需要 `x-admin-key` 或 `Authorization: Bearer <ADMIN_KEY>` 验证
  - 不依赖前端隐藏按钮，后端才是管理员判定来源

- `index.html`
  - 已在页面底部挂载 `window.WT_COMMENT_CONFIG` 和 `reader-comments.js`
  - 这样可以在不破坏阅读体验的前提下预留评论接入入口

部署前你需要补齐：

1. `server/.env`：复制 `.env.example` 后改为真实值
2. `PUBLIC_API`：前端实际访问的评论服务地址
3. `DB_PATH`：本地或托管服务器上的 SQLite 文件路径
4. `ADMIN_KEY`：管理员密钥，不放在前端、公开仓库或提交记录里

安装方式：

```bash
cd server
cp .env.example .env
npm install
npm start
```

前端配置示例：

```html
<script>
  window.WT_COMMENT_CONFIG = {
    enabled: true,
    apiBase: 'https://api.example.com',
    bookId: 'weitu',
    chapterId: 'chapter-01'
  };
</script>
<script src="./reader-comments.js"></script>
```

注意：
- 这份代码已经落到仓库中，但评论服务本身仍然需要你提供真实的部署地址和管理员密钥；我不能在没有配置的情况下声称它已上线。
- 现有小说正文与阅读页面的可见性保持不变，避免重做整站。
- 章节讨论与读后感的结构仍然需要你在页面里补齐对应 DOM 结点；现在脚本已能在页面中安全兼容。
