## 光影集 · 使用说明
- ___DodoBird 的网页摄影长廊。___
- 地址：https://dodobird.pages.dev 或者 https://dodobird.dpdns.org/

### 目录结构

```
/（网站根目录）
├── build.js               # 构建脚本
├── package.json           # 构建依赖和命令
├── css/style.css          # 页面样式源文件
├── js/album.js            # 独立相簿页脚本源文件
├── photo/                 # 相簿源文件和照片
└── public/                # 构建输出目录
    ├── index.html         # 构建生成的主页
    ├── css/               # 构建生成的样式
    ├── js/                # 构建生成的脚本
    └── photo/             # 构建生成的照片和相簿页
    ├── 相簿1/   
    │   ├── cover.jpg      # 主页使用的相簿封面
    │   ├── 图片文件        # jpg png等
    │   ├── describe.json  # 此相簿及里面图片的描述
    │   └── describe.json  # 此相簿及里面图片的描述
    └── 相簿2/   
        ├── cover.jpg
        ├── 图片文件         # jpg png等
        └── describe.json  # 此相簿及里面图片的描述
```

---
### 格式示例
1. 每个相簿的 describe.json（在各个相簿文件夹内）

```ini
ab.title = 相簿标题
ab.dscb = 相簿描述（可覆盖）

001.file = 照片1.jpg
001.title = 作品标题
001.dscb = **描述**，支持 *Markdown*，\n 表示换行。

002.file = 照片2.jpg
002.title = 另一作品
002.dscb = 描述文字...

# 以此类推……
```

构建时会自动读取每张图片的 EXIF，并将元数据追加到描述末尾，例如：

`ISO 32 | 100mm | 0.3 ev | f2.8 | 1/638s`

主页的相簿标签直接来自所有包含 `describe.json` 的相簿文件夹，封面固定为该文件夹内的 `cover.jpg`。

构建还会使用 `sharp` 为封面和每张照片生成 `thumbs/*.jpg` 缩略图。主页和相簿网格只加载缩略图，点击照片时才加载原图。

---

2. 构建和本地预览

先安装依赖并构建静态页面：

```bash
npm install
npm run build
```

构建后从 `public` 目录使用 HTTP 服务器预览（不要双击 index.html）：

- VS Code：右键 → Open with Live Server
- Python：`cd public` 后执行 `python3 -m http.server 8080`，访问 http://localhost:8080

---

3. 部署到 Cloudflare Pages（目前是使用的）
Pages地址（登录访问）：https://dash.cloudflare.com/126585fdb98a654f334f43052e0683da/pages/view/dodobird

1. 推送项目到 GitHub
2. Cloudflare Pages → 连接仓库 → 部署设置：
    · 构建命令：`npm run build`
    · 框架：无（Static）
    · 输出目录：`public`
3. 点击部署，完成。

---

### 常见问题

- 黑屏 → 请通过 HTTP 服务器访问，不要双击文件，也不要删除 HTML 中的元素  
- 相簿为空 → 检查对应文件夹是否有 describe.json
- 图片不显示 → 检查文件名大小写，确认图片在对应文件夹内  
- 换行无效 → 描述中使用 \n 表示换行（例如 第一行\n\n第二行）

---

### 编写者
- OctSeventh, LinusTheDodo, Deepseek
- 使用 MIT License
