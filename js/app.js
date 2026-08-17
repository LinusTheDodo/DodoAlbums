(function() {
    'use strict';

    const $ = (sel) => document.querySelector(sel);
    const $$ = (sel) => document.querySelectorAll(sel);

    const app = $('#app');
    const albumsContainer = $('#albumsContainer');
    const albumDetail = $('#albumDetail');
    const detailTitle = $('#detailTitle');
    const detailDesc = $('#detailDesc');
    const photoGrid = $('#photoGrid');
    const detailBack = $('#detailBack');
    const modalOverlay = $('#modalOverlay');
    const modalImage = $('#modalImage');
    const modalTitle = $('#modalTitle');
    const modalDesc = $('#modalDesc');
    const modalClose = $('#modalClose');
    const backToTopBtn = $('#backToTopBtn');

    let albumsList = [];
    let currentAlbumId = null;
    let currentPhotos = [];
    let currentFolder = '';

    // ======== 工具函数 ========
    function unescapeString(str) {
        if (!str) return '';
        return str
            .replace(/\\n/g, '\n')
            .replace(/\\r/g, '\r')
            .replace(/\\t/g, '\t')
            .replace(/\\"/g, '"')
            .replace(/\\'/g, "'");
    }

    // ======== 解析 albums.json ========
    function parseAlbums(text) {
        const lines = text.split(/\r?\n/);
        const items = {};
        lines.forEach(line => {
            line = line.trim();
            if (!line || line.startsWith('#')) return;
            const eqIndex = line.indexOf('=');
            if (eqIndex === -1) return;
            const key = line.substring(0, eqIndex).trim();
            const value = line.substring(eqIndex + 1).trim();
            const match = key.match(/^(a\d+)\.(title|dscb|cover)$/);
            if (match) {
                const id = match[1];
                const prop = match[2];
                if (!items[id]) items[id] = { id };
                items[id][prop] = unescapeString(value);
            }
        });

        return Object.values(items).map(item => {
            let cover = item.cover || '';
            let folder = '';
            if (cover) {
                let clean = cover.replace(/^\/+|\/+$/g, '');
                const parts = clean.split('/');
                if (parts.length >= 1) folder = parts[0];
                cover = `photo/${clean}`;
            } else {
                folder = item.title || item.id;
                cover = `photo/${folder}/default.jpg`;
            }
            return {
                id: item.id,
                title: item.title || '未命名',
                description: item.dscb || '',
                cover: cover,
                folder: folder
            };
        });
    }

    // ======== 解析 describe.json ========
    function parseDescribe(text) {
        const lines = text.split(/\r?\n/);
        const data = { title: '', description: '', cover: '', photos: [] };
        const photoMap = {};

        lines.forEach(line => {
            line = line.trim();
            if (!line || line.startsWith('#')) return;
            const eqIndex = line.indexOf('=');
            if (eqIndex === -1) return;
            const key = line.substring(0, eqIndex).trim();
            const value = line.substring(eqIndex + 1).trim();

            if (key === 'ab.title') {
                data.title = unescapeString(value);
            } else if (key === 'ab.dscb') {
                data.description = unescapeString(value);
            } else if (key === 'ab.cover') {
                data.cover = unescapeString(value);
            } else if (/^\d{3}\.file$/.test(key)) {
                const idx = key.substring(0, 3);
                if (!photoMap[idx]) photoMap[idx] = {};
                photoMap[idx].file = unescapeString(value);
            } else if (/^\d{3}\.title$/.test(key)) {
                const idx = key.substring(0, 3);
                if (!photoMap[idx]) photoMap[idx] = {};
                photoMap[idx].title = unescapeString(value);
            } else if (/^\d{3}\.dscb$/.test(key)) {
                const idx = key.substring(0, 3);
                if (!photoMap[idx]) photoMap[idx] = {};
                photoMap[idx].description = unescapeString(value);
            }
        });

        const sortedKeys = Object.keys(photoMap).sort();
        data.photos = sortedKeys.map(key => {
            const p = photoMap[key];
            return {
                file: p.file || '',
                title: p.title || '未命名',
                description: p.description || ''
            };
        });
        return data;
    }

    // ======== 错误显示 ========
    function showError(message, details = '') {
        albumsContainer.innerHTML = `
            <div class="empty-state" style="column-span:all;">
                <span>⚠️</span>
                ${message}
                ${details ? `<br /><small style="opacity:0.6;font-size:0.9rem;">${details}</small>` : ''}
            </div>
        `;
        app.classList.add('loaded');
    }

    // ======== 加载 albums.json ========
    async function loadAlbumsList() {
        if (window.location.protocol === 'file:') {
            showError('⛔ 检测到 file:// 协议', '请使用本地 HTTP 服务器（如 VS Code Live Server）打开页面。');
            return;
        }

        try {
            console.log('🔍 尝试加载 albums.json (相对路径)');
            const res = await fetch('albums.json', { cache: 'no-cache' });
            if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
            const text = await res.text();
            albumsList = parseAlbums(text);
            renderAlbums();
            app.classList.add('loaded');
        } catch (err) {
            console.error('加载 albums.json 失败:', err);
            showError(
                '无法加载 albums.json',
                `错误：${err.message}<br />
                 请确保 <code>albums.json</code> 与 <code>index.html</code> 在同一目录，并通过 HTTP 服务器访问。`
            );
        }
    }

    // ======== 渲染相簿 ========
    function renderAlbums() {
        if (!albumsList.length) {
            showError('暂无相簿数据', '请检查 albums.json 内容格式是否正确。');
            return;
        }

        let html = '';
        albumsList.forEach((album) => {
            html += `
                <div class="album-card" data-id="${album.id}">
                    <div class="cover-wrap">
                        <img src="${album.cover}" alt="${album.title}" loading="lazy" onerror="this.src='https://picsum.photos/seed/${album.id}/600/400'" />
                    </div>
                    <div class="info">
                        <h3>${album.title}</h3>
                        <p>${album.description || ''}</p>
                    </div>
                </div>
            `;
        });
        albumsContainer.innerHTML = html;

        document.querySelectorAll('.album-card').forEach((card) => {
            card.addEventListener('click', () => {
                const id = card.dataset.id;
                openAlbum(id);
            });
        });
    }

    // ======== 打开相簿 ========
    async function openAlbum(albumId) {
        const album = albumsList.find(a => a.id === albumId);
        if (!album) return;
        const folder = album.folder;
        currentFolder = folder;

        try {
            const res = await fetch(`photo/${folder}/describe.json`);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const text = await res.text();
            const parsed = parseDescribe(text);

            const title = parsed.title || album.title;
            const description = parsed.description || album.description;
            currentAlbumId = albumId;
            currentPhotos = parsed.photos || [];

            document.querySelector('.albums-section').style.display = 'none';
            albumDetail.classList.add('active');

            detailTitle.textContent = title;
            detailDesc.textContent = description;

            if (!currentPhotos.length) {
                photoGrid.innerHTML = `<div class="empty-state" style="grid-column:1/-1;"><span>📸</span>这个相簿还没有照片。</div>`;
                return;
            }

            let gridHtml = '';
            currentPhotos.forEach((photo, i) => {
                const src = `photo/${folder}/${photo.file}`;
                gridHtml += `
                    <div class="photo-item" data-photoindex="${i}">
                        <img src="${src}" alt="${photo.title}" loading="lazy" onerror="this.src='https://picsum.photos/seed/${folder}${i}/400/300'" />
                    </div>
                `;
            });
            photoGrid.innerHTML = gridHtml;

            document.querySelectorAll('.photo-item').forEach((item) => {
                item.addEventListener('click', () => {
                    const idx = parseInt(item.dataset.photoindex, 10);
                    openModal(folder, idx);
                });
            });

            albumDetail.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } catch (err) {
            console.error('打开相簿失败:', err);
            photoGrid.innerHTML = `
                <div class="empty-state" style="grid-column:1/-1;">
                    <span>⚠️</span>
                    加载相簿数据失败，请检查 <code>photo/${folder}/describe.json</code>。<br />
                    错误：${err.message}
                </div>
            `;
        }
    }

    // ======== 模态框 ========
    function openModal(folder, photoIndex) {
        const photo = currentPhotos[photoIndex];
        if (!photo) return;

        const src = `photo/${folder}/${photo.file}`;
        modalImage.src = src;
        modalImage.alt = photo.title;

        modalTitle.textContent = photo.title || '无标题';

        let descRaw = photo.description || '';
        if (descRaw.trim()) {
            const descWithNewlines = descRaw.replace(/\\n/g, '\n');
            modalDesc.innerHTML = marked.parse(descWithNewlines, { breaks: true });
        } else {
            modalDesc.innerHTML = '<span style="opacity:0.3;font-style:italic;">没有描述</span>';
        }

        modalOverlay.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    function closeModal() {
        modalOverlay.classList.remove('active');
        document.body.style.overflow = '';
    }

    function goHome() {
        albumDetail.classList.remove('active');
        document.querySelector('.albums-section').style.display = 'block';
        currentAlbumId = null;
        currentPhotos = [];
        currentFolder = '';
        document.getElementById('albums').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    // ======== 事件绑定 ========
    detailBack.addEventListener('click', goHome);
    modalClose.textContent = '✕';
    modalClose.addEventListener('click', closeModal);
    modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) closeModal();
    });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modalOverlay.classList.contains('active')) closeModal();
    });

    // ======== Hero 渐变隐藏/显示（使用 class） ========
    const hero = document.querySelector('.hero');
    const albumsSection = document.getElementById('albums');

    if (hero && albumsSection) {
        // 初始检查：如果已经在相簿区域，添加隐藏类
        if (window.scrollY >= albumsSection.offsetTop - 100) {
            hero.classList.add('hero-hidden');
        }

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    hero.classList.add('hero-hidden');
                }
            });
        }, { threshold: 0.1 });

        observer.observe(albumsSection);
    }

    // ======== 回顶按钮：滚动到顶部并移除隐藏类 ========
    if (backToTopBtn) {
        backToTopBtn.addEventListener('click', function() {
            window.scrollTo({ top: 0, behavior: 'smooth' });
            if (hero) {
                hero.classList.remove('hero-hidden');
            }
        });
    }

    // ======== 启动 ========
    loadAlbumsList();

})();
