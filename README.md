## 光影集 · 使用说明
- ___DodoBird 的网页摄影长廊。___
- 地址：https://dodobird.pages.dev 或者 https://dodobird.dpdns.org/

### 目录结构

```
/（网站根目录）
├── index.html             # 主页本体
├── css/style.css          # 主页风格
├── js/app.js              # 主页逻辑
├── albums.json            # 主页相簿索引（必须）
└── photo/                 # 所有相簿文件夹
    ├── 相簿1/   
    │   ├── 图片文件         # jpg png等
    │   └── describe.json  # 此相簿及里面图片的描述
    └── 相簿2/   
        ├── 图片文件         # jpg png等
        └── describe.json  # 此相簿及里面图片的描述
```

---
### 格式示例
1. albums.json（根目录）

```ini
# 相簿列表（编号 a001, a002...）
a001.title = 相簿标题
a001.dscb = 相簿简介
a001.cover = /相簿文件夹/封面图片.jpg

a002.title = 另一相簿
a002.dscb = 简介
a002.cover = /另一文件夹/cover.jpg

# 以此类推……
```

---

2. 每个相簿的 describe.json（在各个相簿文件夹内）

```ini
ab.title = 相簿标题（可覆盖 albums.json）
ab.dscb = 相簿描述（可覆盖）

001.file = 照片1.jpg
001.title = 作品标题
001.dscb = **描述**，支持 *Markdown*，\n 表示换行。

002.file = 照片2.jpg
002.title = 另一作品
002.dscb = 描述文字...

# 以此类推……
```

---

3. 图片路径

- 封面路径：albums.json 中写 /相簿名/图片.jpg
- 照片路径：describe.json 中只写文件名（本相簿内）

---

4. 本地预览（可忽略）

必须使用 HTTP 服务器（不要双击 index.html）：

- VS Code：右键 → Open with Live Server
- Python：python3 -m http.server 8080 → 访问 http://localhost:8080

---

5. 部署到 Cloudflare Pages（目前是使用的）  
Pages地址（登录访问）：https://dash.cloudflare.com/126585fdb98a654f334f43052e0683da/pages/view/dodobird

1. 推送项目到 GitHub
2. Cloudflare Pages → 连接仓库 → 部署设置：
   · 框架：无（Static）
   · 输出目录：/
3. 点击部署，完成。

---

### 常见问题

- 黑屏 → 请通过 HTTP 服务器访问，不要双击文件，也不要删除 HTML 中的元素  
- 相簿为空 → 检查 albums.json 格式是否正确，编号是否连续（a001, a002...）  
- 图片不显示 → 检查文件名大小写，确认图片在对应文件夹内  
- 换行无效 → 描述中使用 \n 表示换行（例如 第一行\n\n第二行）

---

### 编写者
- OctSeventh, LinusTheDodo, Deepseek
- 使用 MIT License
