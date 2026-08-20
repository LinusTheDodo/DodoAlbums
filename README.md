# 光影集

DodoBird 的网页摄影长廊。

## 工作方式

这是一个静态网站生成项目。照片和描述文件放在 `photo/` 中，执行构建命令后，完整网站会生成到 `public/` 目录。

主页和相簿页面都是构建产物，部署时只需要发布 `public/`，不需要在浏览器运行时读取 `describe.json`。

## 项目结构

```text
/
├── build.js                # Node.js 构建脚本
├── package.json            # 构建命令和依赖
├── css/style.css           # 页面样式源文件
├── js/album.js             # 相簿页照片预览脚本
├── photo/                  # 相簿源文件和原始照片
│   ├── 城市回响/
│   │   ├── cover.jpg       # 相簿封面，必须存在
│   │   ├── describe.json   # 相簿和照片描述
│   │   └── *.jpeg          # 原始照片
│   └── 其他相簿/
└── public/                 # 构建生成目录，不手动编辑
    ├── index.html          # 主页
    ├── css/                # 复制后的样式
    ├── js/                 # 复制后的脚本
    └── photo/              # 照片、缩略图和独立相簿页
```

`albums.json` 已废除。主页会自动扫描所有包含 `describe.json` 和 `cover.jpg` 的相簿目录。

## 添加相簿

在 `photo/` 下新建一个目录，并至少放入：

```text
photo/我的相簿/
├── cover.jpg
├── describe.json
└── photo-001.jpg
```

`cover.jpg` 是主页相簿卡片使用的封面。相簿目录名会成为页面路径，例如：

```text
public/photo/我的相簿/
```

主页使用目录链接访问相簿，因此地址不会显示 `index.html`。

## describe.json 格式

文件名虽然是 `.json`，内容使用项目自定义的键值格式：

```ini
# 相簿信息
ab.title = 城市热岛效应
ab.dscb = 穿梭于钢筋森林中的光影碎片

# 照片信息
001.file = photo-001.jpg
001.title = 照片标题
001.dscb = **照片描述**，支持 Markdown。\n第二行描述。

002.file = photo-002.jpg
002.title = 另一张照片
002.dscb = 另一段描述。
```

照片编号按字典序排列。照片文件只填写当前相簿目录内的文件名。

## 自动处理

执行构建时会自动完成以下工作：

- 扫描 `photo/*/describe.json`，生成主页相簿列表。
- 使用每个相簿目录中的 `cover.jpg` 生成主页封面。
- 使用 `sharp` 为封面和照片生成 `thumbs/*.jpg` 缩略图。
- 主页和相簿网格只加载缩略图，点击照片预览时才加载原图。
- 使用照片 EXIF 生成拍摄参数，并追加到描述末尾，例如：

  ```text
  ISO 32 | 100mm | 0.3 ev | f2.8 | 1/638s
  ```

- 为每个相簿生成独立的 `public/photo/<相簿>/index.html`。
- 在每个相簿页面底部嵌入 Giscus 评论区，评论通过页面路径独立映射；主页不显示评论区。

如果描述文件引用了不存在的照片，构建会输出警告并跳过该照片，其余内容仍会继续生成。

## 构建

在项目根目录执行：

```powershell
npm install
npm run build
```

构建结果位于 `public/`。每次构建会重新生成该目录，因此不要直接修改其中的文件。

## 本地预览

构建完成后，从 `public/` 启动 HTTP 服务器：

```powershell
python -m http.server 8080 --directory public
```

访问：

```text
http://localhost:8080
```

不要直接双击 HTML 文件，否则目录索引、图片和 Giscus 可能无法正常工作。

## Cloudflare Pages 部署

Cloudflare Pages 配置：

```text
构建命令：npm run build
输出目录：public
框架：无（Static）
```

Giscus 评论区需要仓库启用 Discussions，并正确配置对应的评论分类。当前使用 `General` 分类，评论按相簿页面的 pathname 区分。

## 常见问题

### 相簿没有出现在主页

确认相簿目录同时包含：

```text
describe.json
cover.jpg
```

然后重新执行 `npm run build`。

### 照片没有显示

检查 `describe.json` 中的文件名大小写，并确认照片确实位于对应相簿目录内。

### 描述没有换行

在描述中使用 `\n`，例如：

```text
001.dscb = 第一行\n第二行
```

### 评论区没有显示

确认通过 HTTP 服务器访问，并检查 GitHub Discussions、Giscus 配置和网络连接。

## 许可

本项目使用 MIT License。摄影作品版权归作者所有，未经授权不得转载、复制或用于商业用途。
