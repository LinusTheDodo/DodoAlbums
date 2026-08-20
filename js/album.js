(function () {
    'use strict';

    const overlay = document.querySelector('#modalOverlay');
    const image = document.querySelector('#modalImage');
    const title = document.querySelector('#modalTitle');
    const description = document.querySelector('#modalDesc');
    const photos = window.albumPhotos || [];

    function openModal(index) {
        const photo = photos[index];
        if (!photo) return;
        image.src = photo.file;
        image.alt = photo.title;
        title.textContent = photo.title || '无标题';
        description.innerHTML = photo.description.trim()
            ? marked.parse(photo.description, { breaks: true })
            : '<span style="opacity:0.3;font-style:italic;">没有描述</span>';
        overlay.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    function closeModal() {
        overlay.classList.remove('active');
        document.body.style.overflow = '';
    }

    document.querySelectorAll('.photo-item').forEach((item) => {
        item.addEventListener('click', () => openModal(Number(item.dataset.photoIndex)));
    });
    document.querySelector('.modal-close').addEventListener('click', closeModal);
    overlay.addEventListener('click', (event) => {
        if (event.target === overlay) closeModal();
    });
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') closeModal();
    });
})();