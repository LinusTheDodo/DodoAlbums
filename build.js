const fs = require('node:fs/promises');
const path = require('node:path');
const exifr = require('exifr');
const sharp = require('sharp');

const root = __dirname;
const photoRoot = path.join(root, 'photo');
const publicRoot = path.join(root, 'public');
const publicPhotoRoot = path.join(publicRoot, 'photo');
const cssPath = 'css/style.css';
const footer = `© 2026 DodoNotFound 版权所有。<br>本网站所有摄影作品受著作权法保护，未经书面授权，禁止任何形式的转载、复制及商业使用。<br>商务合作或授权需求，请联系 3845766679@qq.com。`;

function unescapeValue(value) {
  return value.replace(/\\n/g, '\n').replace(/\\r/g, '\r').replace(/\\t/g, '\t').replace(/\\"/g, '"').replace(/\\'/g, "'");
}

function parseDescribe(text) {
  const album = { title: '', description: '', photos: [] };
  const photos = new Map();

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const separator = line.indexOf('=');
    if (separator === -1) continue;

    const key = line.slice(0, separator).trim();
    const value = unescapeValue(line.slice(separator + 1).trim());
    if (key === 'ab.title') album.title = value;
    else if (key === 'ab.dscb') album.description = value === 'null' ? '' : value;
    else if (/^\d{3}\.(file|title|dscb)$/.test(key)) {
      const [index, field] = key.split('.');
      const photo = photos.get(index) || {};
      photo[field] = value === 'null' ? '' : value;
      photos.set(index, photo);
    }
  }

  album.photos = [...photos.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([, photo]) => ({
    file: photo.file || '',
    title: photo.title || '未命名',
    description: photo.dscb || ''
  })).filter(photo => photo.file);
  return album;
}

function number(value, digits = 2) {
  return Number(value).toFixed(digits).replace(/\.0+$|(?<=\.[0-9])0+$/, '');
}

function formatMetadata(exif) {
  if (!exif || exif.ISO == null || exif.FocalLength == null || exif.FNumber == null || exif.ExposureTime == null) return '';
  const exposure = exif.ExposureTime < 1
    ? `1/${Math.round(1 / exif.ExposureTime)}s`
    : `${Number(exif.ExposureTime).toFixed(1)}s`;
  const compensation = exif.ExposureCompensation == null ? '0' : number(exif.ExposureCompensation);
  return `ISO ${Math.round(exif.ISO)} | ${number(exif.FocalLength)}mm | ${compensation} ev | f${number(exif.FNumber)} | ${exposure}`;
}

function addMetadata(description, metadata) {
  const cleaned = description.replace(/\n?`ISO [^`]+`\s*$/, '').trimEnd();
  return metadata ? `${cleaned}${cleaned ? '\n' : ''}\`${metadata}\`` : cleaned;
}

function escapeHtml(value) {
  return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function assetPath(...parts) {
  return parts.map(part => encodeURIComponent(part)).join('/');
}

async function readAlbums() {
  const entries = await fs.readdir(photoRoot, { withFileTypes: true });
  const albums = [];
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    if (!entry.isDirectory()) continue;
    const folder = entry.name;
    const describePath = path.join(photoRoot, folder, 'describe.json');
    let describeText;
    try {
      describeText = await fs.readFile(describePath, 'utf8');
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
      continue;
    }
    await fs.access(path.join(photoRoot, folder, 'cover.jpg'));
    const album = parseDescribe(describeText);
    album.folder = folder;
    album.title ||= folder;
    album.cover = 'cover.jpg';
    albums.push(album);
  }
  return albums;
}

async function enrichPhotos(album) {
  const availablePhotos = [];
  for (const photo of album.photos) {
    const imagePath = path.join(photoRoot, album.folder, photo.file);
    try {
      await fs.access(imagePath);
    } catch {
      console.warn(`[${album.folder}] missing photo: ${photo.file}`);
      continue;
    }
    const exif = await exifr.parse(imagePath, { pick: ['ISO', 'FocalLength', 'ExposureCompensation', 'FNumber', 'ExposureTime'] });
    photo.description = addMetadata(photo.description, formatMetadata(exif));
    photo.thumbnail = assetPath('thumbs', `${path.parse(photo.file).name}.jpg`);
    availablePhotos.push(photo);
  }
  album.photos = availablePhotos;
}

async function createThumbnail(sourcePath, outputPath) {
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await sharp(sourcePath).rotate().resize({ width: 640, height: 640, fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 72, progressive: true }).toFile(outputPath);
}

async function createAlbumThumbnails(album) {
  const sourceFolder = path.join(photoRoot, album.folder);
  const outputFolder = path.join(publicPhotoRoot, album.folder, 'thumbs');
  await createThumbnail(path.join(sourceFolder, album.cover), path.join(outputFolder, 'cover.jpg'));
  for (const photo of album.photos) {
    await createThumbnail(path.join(sourceFolder, photo.file), path.join(outputFolder, `${path.parse(photo.file).name}.jpg`));
  }
}

function pageHead(title, stylesheet = cssPath) {
  return `<!DOCTYPE html>\n<html lang="zh-CN">\n<head>\n<meta charset="UTF-8">\n<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">\n<title>${escapeHtml(title)}</title>\n<link rel="preconnect" href="https://fonts.googleapis.com">\n<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n<link href="https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,400..900&family=Playfair+Display:ital,wght@0,400..900;1,400..900&display=swap" rel="stylesheet">\n<link rel="stylesheet" href="${stylesheet}">`;
}

function renderIndex(albums) {
  const cards = albums.map(album => `
      <a class="album-card" href="${assetPath('photo', album.folder)}/">
        <div class="cover-wrap"><img src="${assetPath('photo', album.folder, 'thumbs', 'cover.jpg')}" alt="${escapeHtml(album.title)}" loading="lazy"></div>
        <div class="info"><h3>${escapeHtml(album.title)}</h3><p>${escapeHtml(album.description)}</p></div>
      </a>`).join('');
  return `${pageHead('光影集 · 摄影作品')}</head>\n<body><div id="app"><div id="pageContainer" class="page-container">
    <section class="page-section hero"><div class="hero-inner glass"><img class="hero-avatar" src="photo/head.jpg" alt="DodoBird 头像"><h1 class="hero-name">DodoBird's Gallery</h1><p class="hero-tagline">Lens · Light · Life</p><div class="hero-divider"></div><p class="hero-desc">这里是一个小站，站长第一次有个人网站，请多多关注喵。<br>本站现为摄影作品展示，以后会慢慢加上主页等等其他东西比如音乐评鉴（不是）和一些化学相关的小功能</p><a class="hero-scroll-hint" href="#albums">向下滚动 <span class="arrow">↓</span></a></div></section>
    <section class="page-section albums-section" id="albums"><div class="albums-header"><h2 class="section-title">相 簿</h2><p class="section-sub">用影像串联起时间的碎片</p></div><div class="albums-masonry">${cards}</div><footer class="site-footer">${footer}</footer></section>
  </div></div></body></html>`;
}

function renderAlbum(album) {
  const photos = album.photos.map((photo, index) => `
    <button class="photo-item" type="button" data-photo-index="${index}"><img src="${escapeHtml(photo.thumbnail)}" alt="${escapeHtml(photo.title)}" loading="lazy"></button>`).join('');
  const photoData = JSON.stringify(album.photos).replace(/</g, '\\u003c');
  return `${pageHead(album.title, '../../css/style.css')}\n<script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>\n</head><body><main class="album-detail active">
    <header class="detail-header"><a class="detail-back" href="../../index.html">← 返回</a><h1 class="detail-title">${escapeHtml(album.title)}</h1><p class="detail-desc">${escapeHtml(album.description)}</p></header>
    <div class="photo-grid">${photos || '<div class="empty-state">这个相簿还没有照片。</div>'}</div><section class="album-comments" aria-label="相簿评论"><h2>评论</h2><script src="https://giscus.app/client.js"
      data-repo="LinusTheDodo/DodoAlbums"
      data-repo-id="R_kgDOT61XYQ"
      data-category="General"
      data-category-id="DIC_kwDOT61XYc4DDyqO"
      data-mapping="pathname"
      data-strict="0"
      data-reactions-enabled="1"
      data-emit-metadata="0"
      data-input-position="bottom"
      data-theme="dark"
      data-lang="zh-CN"
      crossorigin="anonymous"
      async></script></section><footer class="site-footer">${footer}</footer>
  </main><div class="modal-overlay" id="modalOverlay"><div class="modal-content"><div class="modal-image-wrap"><button class="modal-close" type="button" aria-label="关闭">✕</button><img id="modalImage" alt=""></div><div class="modal-body"><h2 class="photo-title" id="modalTitle"></h2><div class="photo-desc" id="modalDesc"></div></div></div></div>
  <script>window.albumPhotos = ${photoData};</script><script src="../../js/album.js"></script></body></html>`;
}

async function build() {
  const albums = await readAlbums();
  await fs.rm(publicRoot, { recursive: true, force: true });
  await fs.mkdir(publicRoot, { recursive: true });
  await fs.cp(path.join(root, 'css'), path.join(publicRoot, 'css'), { recursive: true });
  await fs.mkdir(path.join(publicRoot, 'js'), { recursive: true });
  await fs.cp(path.join(root, 'js', 'album.js'), path.join(publicRoot, 'js', 'album.js'));
  await fs.cp(photoRoot, publicPhotoRoot, { recursive: true });

  for (const album of albums) {
    await enrichPhotos(album);
    await createAlbumThumbnails(album);
    await fs.writeFile(path.join(publicPhotoRoot, album.folder, 'index.html'), renderAlbum(album));
  }
  await fs.writeFile(path.join(publicRoot, 'index.html'), renderIndex(albums));
  console.log(`Built ${albums.length} album page(s) in public/.`);
}

build().catch(error => {
  console.error(error);
  process.exitCode = 1;
});