(() => {
    'use strict';

    const $ = (selector, root = document) => root.querySelector(selector);
    const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

    const STORAGE = {
        title: 'wysing:title',
        content: 'wysing:content',
        savedAt: 'wysing:savedAt'
    };

    const SAMPLE = `
        <h1>Bienvenido a Wysing</h1>
        <p>Un editor <strong>ligero</strong> y <em>enfocado</em> en lo que importa: tu texto. Selecciona cualquier fragmento y usa la barra superior para darle formato.</p>
        <h2>Un lienzo en blanco, sin ruido</h2>
        <p>Puedes escribir títulos, listas, citas, enlaces e imágenes. Todo se guarda automáticamente en este navegador, sin cuentas ni servidores.</p>
        <blockquote>La mejor herramienta es la que desaparece mientras escribes.</blockquote>
        <ul>
            <li>Formato básico: <strong>negrita</strong>, <em>cursiva</em> y <u>subrayado</u>.</li>
            <li>Colores suaves para resaltar sin distraer.</li>
            <li>Descarga tu documento como HTML cuando quieras.</li>
        </ul>
        <p>Empieza a escribir…</p>
    `;

    const TEXT_COLORS = [
        '#2f3237', '#5b6977', '#6f7d8c', '#7d8f7a', '#5f7d7a', '#8a7f9c',
        '#b08a6a', '#a9736d', '#7c828a', '#456b6a', '#7a6a55', '#9a8a5f'
    ];

    const HIGHLIGHTS = [
        '#f5e7c8', '#e9edd7', '#dfeaf1', '#f2dfe0', '#ece5f2', '#f7ecdc',
        '#e3e9e2', '#efe9df', '#e8e6f0', '#e1eceb', '#f3e4d6', '#eaeadf'
    ];

    const app = $('#app');
    const editor = $('#editor');
    const docTitle = $('#docTitle');
    const saveState = $('#saveState');
    const saveLabel = $('#saveLabel');
    const savedAt = $('#savedAt');
    const wordCount = $('#wordCount');
    const charCount = $('#charCount');
    const readTime = $('#readTime');
    const toolbar = $('#toolbar');
    const blockSelect = $('#blockSelect');
    const textColorBtn = $('#textColorBtn');
    const textColorPop = $('#textColorPop');
    const textColorSwatches = $('#textColorSwatches');
    const textColorSwatch = $('#textColorSwatch');
    const highlightBtn = $('#highlightBtn');
    const highlightPop = $('#highlightPop');
    const highlightSwatches = $('#highlightSwatches');
    const highlightSwatch = $('#highlightSwatch');
    const clearHighlight = $('#clearHighlight');
    const linkBtn = $('#linkBtn');
    const imageBtn = $('#imageBtn');
    const linkModal = $('#linkModal');
    const linkText = $('#linkText');
    const linkUrl = $('#linkUrl');
    const linkSave = $('#linkSave');
    const imageModal = $('#imageModal');
    const imageUrl = $('#imageUrl');
    const imageSave = $('#imageSave');
    const pickImageBtn = $('#pickImageBtn');
    const imageInput = $('#imageInput');
    const imageReplaceInput = $('#imageReplaceInput');
    const imageBar = $('#imageBar');
    const imageSize = $('#imageSize');
    const imageDeleteBtn = $('#imageDeleteBtn');
    const imageReplaceBtn = $('#imageReplaceBtn');
    const previewBtn = $('#previewBtn');
    const newBtn = $('#newBtn');
    const copyBtn = $('#copyBtn');
    const downloadBtn = $('#downloadBtn');
    const printBtn = $('#printBtn');
    const clearBtn = $('#clearBtn');
    const toastEl = $('#toast');

    let savedRange = null;
    let selectedImage = null;
    let saveTimer = 0;
    let toastTimer = 0;

    function escapeHtml(value) {
        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function escapeAttr(value) {
        return escapeHtml(value).replace(/`/g, '&#96;');
    }

    function normalizeUrl(value) {
        const raw = String(value || '').trim();
        if (!raw) return '';
        if (/^(https?:\/\/|mailto:|tel:|data:image\/|#|\/|\.{1,2}\/)/i.test(raw)) return raw;
        if (/^[\w.-]+\.[a-z]{2,}(\S*)?$/i.test(raw)) return `https://${raw}`;
        return raw;
    }

    function slugify(value) {
        const slug = String(value || '')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^\w\s-]/g, '')
            .trim()
            .replace(/\s+/g, '-')
            .toLowerCase();
        return slug || 'documento';
    }

    function formatTime(date) {
        try {
            return date.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });
        } catch (error) {
            return '';
        }
    }

    function toast(message) {
        toastEl.textContent = message;
        toastEl.classList.add('is-visible');
        window.clearTimeout(toastTimer);
        toastTimer = window.setTimeout(() => {
            toastEl.classList.remove('is-visible');
        }, 2400);
    }

    function setSaveState(saving) {
        saveState.classList.toggle('is-saving', Boolean(saving));
        saveLabel.textContent = saving ? 'Guardando…' : 'Guardado';
    }

    function saveSelection() {
        const selection = window.getSelection();
        if (!selection || !selection.rangeCount) return;
        const range = selection.getRangeAt(0);
        if (editor.contains(range.commonAncestorContainer)) {
            savedRange = range.cloneRange();
        }
    }

    function restoreSelection() {
        if (!savedRange) return;
        const selection = window.getSelection();
        if (!selection) return;
        selection.removeAllRanges();
        selection.addRange(savedRange);
    }

    function updateStats() {
        const text = editor.innerText.replace(/\u00a0/g, ' ').trim();
        const words = text ? text.split(/\s+/).length : 0;
        const chars = text.length;
        const minutes = Math.max(1, Math.ceil(words / 200));
        wordCount.textContent = `${words} ${words === 1 ? 'palabra' : 'palabras'}`;
        charCount.textContent = `${chars} ${chars === 1 ? 'carácter' : 'caracteres'}`;
        readTime.textContent = `${minutes} min de lectura`;
    }

    function saveNow() {
        window.clearTimeout(saveTimer);
        try {
            const now = new Date();
            localStorage.setItem(STORAGE.title, docTitle.value);
            localStorage.setItem(STORAGE.content, editor.innerHTML);
            localStorage.setItem(STORAGE.savedAt, now.toISOString());
            savedAt.textContent = formatTime(now);
            setSaveState(false);
            return true;
        } catch (error) {
            setSaveState(false);
            toast('No se pudo guardar: el documento es demasiado grande.');
            return false;
        }
    }

    function scheduleSave() {
        setSaveState(true);
        window.clearTimeout(saveTimer);
        saveTimer = window.setTimeout(saveNow, 650);
    }

    function prepareLinks() {
        $$('a', editor).forEach((link) => {
            if (!link.getAttribute('href')) return;
            if (link.getAttribute('target') !== '_blank') link.setAttribute('target', '_blank');
            if (link.getAttribute('rel') !== 'noopener noreferrer') link.setAttribute('rel', 'noopener noreferrer');
        });
    }

    function onContentChange() {
        if (selectedImage && !selectedImage.isConnected) clearImageSelection();
        prepareLinks();
        updateStats();
        scheduleSave();
        refreshToolbar();
    }

    function refreshToolbar() {
        $$('[data-cmd]', toolbar).forEach((button) => {
            const command = button.dataset.cmd;
            if (!command) return;
            let active = false;
            try {
                active = document.queryCommandState(command);
            } catch (error) {
                active = false;
            }
            button.classList.toggle('is-active', active);
        });

        let block = '';
        try {
            block = String(document.queryCommandValue('formatBlock') || '').toLowerCase();
        } catch (error) {
            block = '';
        }
        blockSelect.value = ['h1', 'h2', 'h3', 'blockquote', 'pre'].includes(block) ? block : 'p';

        try {
            const color = document.queryCommandValue('foreColor');
            if (color) textColorSwatch.style.background = color;
        } catch (error) {
        }
    }

    function closePopovers() {
        $$('.popover').forEach((popover) => {
            popover.hidden = true;
        });
        [textColorBtn, highlightBtn].forEach((button) => {
            button.setAttribute('aria-expanded', 'false');
        });
    }

    function positionPopover(popover, anchor) {
        const rect = anchor.getBoundingClientRect();
        const width = popover.offsetWidth || 214;
        const margin = 10;
        const left = Math.max(margin, Math.min(rect.left + rect.width / 2 - width / 2, window.innerWidth - width - margin));
        popover.style.left = `${Math.round(left)}px`;
        popover.style.top = `${Math.round(rect.bottom + 10)}px`;
    }

    function closeModal(modal) {
        modal.hidden = true;
    }

    function closeModals() {
        $$('.modal-layer').forEach((modal) => {
            modal.hidden = true;
        });
    }

    function openModal(modal) {
        closeModals();
        closePopovers();
        modal.hidden = false;
    }

    function insertHtml(html) {
        editor.focus();
        restoreSelection();
        document.execCommand('insertHTML', false, html);
        onContentChange();
    }

    function insertImageSrc(src, alt = '') {
        const token = `wysing-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        insertHtml(`<img src="${escapeAttr(src)}" alt="${escapeAttr(alt)}" data-wysing-token="${token}">`);
        const image = editor.querySelector(`img[data-wysing-token="${token}"]`);
        if (!image) return;
        image.removeAttribute('data-wysing-token');
        applyImageAlignment(image, 'left');
        selectImage(image);
    }

    function insertImageFile(file, done) {
        if (!file || !file.type || !file.type.startsWith('image/')) return;
        const reader = new FileReader();
        reader.addEventListener('load', () => {
            insertImageSrc(String(reader.result || ''), file.name || '');
            if (typeof done === 'function') done();
        });
        reader.readAsDataURL(file);
    }

    function getImageAlignment(image) {
        return image.dataset.align || 'left';
    }

    function updateImageBar() {
        $$('[data-img-align]', imageBar).forEach((button) => {
            button.classList.toggle('is-active', Boolean(selectedImage) && button.dataset.imgAlign === getImageAlignment(selectedImage));
        });
        const width = selectedImage ? selectedImage.style.width || '' : '';
        imageSize.value = /^\d+%$/.test(width) ? width.replace('%', '') : '';
    }

    function clearImageSelection() {
        if (selectedImage) selectedImage.classList.remove('is-selected');
        selectedImage = null;
        imageBar.hidden = true;
    }

    function positionImageBar() {
        if (!selectedImage || !selectedImage.isConnected) {
            clearImageSelection();
            return;
        }
        imageBar.hidden = false;
        const rect = selectedImage.getBoundingClientRect();
        if (rect.bottom < 4 || rect.top > window.innerHeight - 4) {
            imageBar.hidden = true;
            return;
        }
        const bar = imageBar.getBoundingClientRect();
        const gap = 10;
        const margin = 8;
        const top = rect.top - bar.height - gap >= margin ? rect.top - bar.height - gap : rect.bottom + gap;
        const left = Math.max(margin, Math.min(rect.left + rect.width / 2 - bar.width / 2, window.innerWidth - bar.width - margin));
        imageBar.style.left = `${Math.round(left)}px`;
        imageBar.style.top = `${Math.round(top)}px`;
    }

    function selectImage(image) {
        if (selectedImage && selectedImage !== image) selectedImage.classList.remove('is-selected');
        selectedImage = image;
        image.classList.add('is-selected');
        updateImageBar();
        positionImageBar();
    }

    function applyImageAlignment(image, align) {
        image.dataset.align = align;
        if (align === 'center') {
            image.style.marginLeft = 'auto';
            image.style.marginRight = 'auto';
        } else if (align === 'right') {
            image.style.marginLeft = 'auto';
            image.style.marginRight = '0';
        } else {
            image.style.marginLeft = '0';
            image.style.marginRight = 'auto';
        }
        updateImageBar();
        positionImageBar();
        onContentChange();
    }

    function deleteSelectedImage() {
        if (!selectedImage) return;
        const image = selectedImage;
        clearImageSelection();
        image.remove();
        onContentChange();
    }

    function buildSwatches(container, colors, onPick) {
        colors.forEach((color) => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'swatch';
            button.style.setProperty('--c', color);
            button.dataset.color = color;
            button.title = color;
            button.setAttribute('aria-label', `Aplicar color ${color}`);
            container.appendChild(button);
        });
        container.addEventListener('mousedown', (event) => {
            event.preventDefault();
        });
        container.addEventListener('click', (event) => {
            const swatch = event.target.closest('.swatch');
            if (!swatch) return;
            onPick(swatch.dataset.color);
        });
    }

    function applyColor(command, color) {
        editor.focus();
        restoreSelection();
        document.execCommand('styleWithCSS', false, true);
        document.execCommand(command, false, color);
        onContentChange();
        closePopovers();
    }

    function setPreview(enabled) {
        app.classList.toggle('is-preview', enabled);
        previewBtn.classList.toggle('is-active', enabled);
        previewBtn.setAttribute('aria-pressed', String(enabled));
        editor.contentEditable = enabled ? 'false' : 'true';
        const icon = previewBtn.querySelector('.miller-icon');
        const label = previewBtn.querySelector('.btn__label');
        if (icon) icon.dataset.icon = enabled ? 'pencil' : 'eye';
        if (label) label.textContent = enabled ? 'Volver a editar' : 'Vista previa';
        previewBtn.title = enabled ? 'Volver a editar' : 'Vista previa de lectura';
        closePopovers();
        closeModals();
        clearImageSelection();
        if (!enabled) editor.focus();
    }

    function resetDocument(nextTitle) {
        if (app.classList.contains('is-preview')) setPreview(false);
        clearImageSelection();
        editor.innerHTML = '';
        docTitle.value = nextTitle;
        savedRange = null;
        updateStats();
        saveNow();
        editor.focus();
    }

    function buildExportHtml() {
        const title = escapeHtml(docTitle.value.trim() || 'Documento sin título');
        const body = editor.innerHTML;
        return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title}</title>
<style>
:root { color-scheme: light; }
* { box-sizing: border-box; }
body { margin: 0; background: #f3f2ee; color: #35383d; font-family: "Iowan Old Style", "Palatino Linotype", Georgia, serif; font-size: 17.5px; line-height: 1.72; }
main { max-width: 820px; margin: 48px auto; padding: 60px 72px; background: #fffefa; border: 1px solid #e6e2da; border-radius: 14px; }
h1, h2, h3 { font-family: "Segoe UI", ui-sans-serif, system-ui, sans-serif; color: #282b2f; letter-spacing: -0.022em; line-height: 1.22; }
h1 { font-size: 2em; margin: 0.2em 0 0.55em; }
h2 { font-size: 1.5em; margin: 1.5em 0 0.5em; }
h3 { font-size: 1.15em; margin: 1.35em 0 0.4em; }
p { margin: 0 0 1em; }
a { color: #5b6977; cursor: pointer; text-underline-offset: 2.5px; }
ul, ol { margin: 0 0 1em; padding-left: 1.5em; }
li::marker { color: #6f7d8c; }
blockquote { margin: 1.5em 0; padding: 0.9em 1.3em; background: #f7f5f0; border-left: 3px solid #cfd6cd; border-radius: 0 10px 10px 0; color: #4f545a; }
pre { padding: 14px 17px; background: #f4f2ec; border: 1px solid #e6e2da; border-radius: 10px; white-space: pre-wrap; overflow-x: auto; font-family: "Cascadia Code", Consolas, monospace; font-size: 13.5px; }
code { padding: 2px 5px; background: #f1efe9; border-radius: 5px; font-family: "Cascadia Code", Consolas, monospace; font-size: 0.87em; }
pre code { padding: 0; background: transparent; }
hr { margin: 2em 0; border: 0; border-top: 1px dashed #d9d4ca; }
img { display: block; max-width: 100%; height: auto; margin: 1.5em 0; border-radius: 10px; }
@media (max-width: 640px) { main { margin: 0; padding: 32px 22px; border: 0; border-radius: 0; } }
</style>
</head>
<body>
<main>
${body}
</main>
</body>
</html>`;
    }

    async function copyHtml() {
        const html = editor.innerHTML;
        try {
            await navigator.clipboard.writeText(html);
            toast('HTML copiado al portapapeles');
        } catch (error) {
            const helper = document.createElement('textarea');
            helper.value = html;
            helper.style.position = 'fixed';
            helper.style.opacity = '0';
            document.body.appendChild(helper);
            helper.select();
            try {
                document.execCommand('copy');
                toast('HTML copiado al portapapeles');
            } catch (fallbackError) {
                toast('No se pudo copiar el HTML');
            }
            helper.remove();
        }
    }

    function downloadHtml() {
        const blob = new Blob([buildExportHtml()], { type: 'text/html;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${slugify(docTitle.value)}.html`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.setTimeout(() => URL.revokeObjectURL(url), 2000);
        toast('Documento descargado');
    }

    function openImageModal() {
        saveSelection();
        imageUrl.value = '';
        openModal(imageModal);
        imageUrl.focus();
    }

    function applyLink() {
        const url = normalizeUrl(linkUrl.value);
        const text = linkText.value.trim();
        if (!url) {
            linkUrl.focus();
            return;
        }
        const hasSelection = savedRange && !savedRange.collapsed;
        if (text) {
            insertHtml(`<a href="${escapeAttr(url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(text)}</a>`);
        } else if (hasSelection) {
            editor.focus();
            restoreSelection();
            document.execCommand('styleWithCSS', false, true);
            document.execCommand('createLink', false, url);
            onContentChange();
        } else {
            insertHtml(`<a href="${escapeAttr(url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(url)}</a>`);
        }
        closeModal(linkModal);
        toast('Enlace insertado');
    }

    function applyImageUrl() {
        const url = normalizeUrl(imageUrl.value);
        if (!url) {
            imageUrl.focus();
            return;
        }
        insertImageSrc(url);
        closeModal(imageModal);
        toast('Imagen insertada');
    }

    buildSwatches(textColorSwatches, TEXT_COLORS, (color) => {
        textColorSwatch.style.background = color;
        applyColor('foreColor', color);
    });

    buildSwatches(highlightSwatches, HIGHLIGHTS, (color) => {
        highlightSwatch.style.background = color;
        applyColor('hiliteColor', color);
    });

    clearHighlight.addEventListener('click', () => {
        applyColor('hiliteColor', 'transparent');
        highlightSwatch.style.background = '#e9edd7';
    });

    $$('.popover').forEach((popover) => {
        popover.addEventListener('mousedown', (event) => {
            event.preventDefault();
        });
    });

    toolbar.addEventListener('mousedown', (event) => {
        if (event.target.closest('button')) event.preventDefault();
    });

    toolbar.addEventListener('click', (event) => {
        const button = event.target.closest('[data-cmd]');
        if (!button) return;
        const command = button.dataset.cmd;
        editor.focus();
        restoreSelection();
        document.execCommand('styleWithCSS', false, true);
        document.execCommand(command, false, button.dataset.value || null);
        onContentChange();
    });

    blockSelect.addEventListener('mousedown', saveSelection);
    blockSelect.addEventListener('change', () => {
        const tag = blockSelect.value;
        editor.focus();
        restoreSelection();
        document.execCommand('styleWithCSS', false, true);
        document.execCommand('formatBlock', false, `<${tag}>`);
        onContentChange();
    });

    textColorBtn.addEventListener('click', (event) => {
        event.stopPropagation();
        const isOpen = !textColorPop.hidden;
        closePopovers();
        if (!isOpen) {
            saveSelection();
            textColorPop.hidden = false;
            textColorBtn.setAttribute('aria-expanded', 'true');
            positionPopover(textColorPop, textColorBtn);
        }
    });

    highlightBtn.addEventListener('click', (event) => {
        event.stopPropagation();
        const isOpen = !highlightPop.hidden;
        closePopovers();
        if (!isOpen) {
            saveSelection();
            highlightPop.hidden = false;
            highlightBtn.setAttribute('aria-expanded', 'true');
            positionPopover(highlightPop, highlightBtn);
        }
    });

    document.addEventListener('click', (event) => {
        if (!event.target.closest('.tool-wrap')) closePopovers();
    });

    document.addEventListener('mousedown', (event) => {
        if (!selectedImage) return;
        if (event.target.closest('#imageBar') || event.target.closest('#editor')) return;
        clearImageSelection();
    });

    function handleViewportChange() {
        closePopovers();
        if (selectedImage) positionImageBar();
    }

    window.addEventListener('resize', handleViewportChange);
    toolbar.addEventListener('scroll', closePopovers, { passive: true });
    $('.workspace').addEventListener('scroll', handleViewportChange, { passive: true });

    linkBtn.addEventListener('click', () => {
        saveSelection();
        const selection = window.getSelection();
        linkText.value = selection && !selection.isCollapsed ? selection.toString().trim() : '';
        linkUrl.value = '';
        openModal(linkModal);
        linkUrl.focus();
    });

    imageBtn.addEventListener('click', openImageModal);

    linkSave.addEventListener('click', applyLink);
    imageSave.addEventListener('click', applyImageUrl);

    linkText.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            linkUrl.focus();
        }
    });

    linkUrl.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            applyLink();
        }
    });

    imageUrl.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            applyImageUrl();
        }
    });

    pickImageBtn.addEventListener('click', () => {
        imageInput.value = '';
        imageInput.click();
    });

    imageInput.addEventListener('change', () => {
        const file = imageInput.files && imageInput.files[0];
        if (!file) return;
        insertImageFile(file, () => {
            closeModal(imageModal);
            toast('Imagen insertada');
        });
    });

    imageBar.addEventListener('mousedown', (event) => {
        if (event.target.closest('button')) event.preventDefault();
    });

    imageBar.addEventListener('click', (event) => {
        const alignButton = event.target.closest('[data-img-align]');
        if (alignButton && selectedImage) applyImageAlignment(selectedImage, alignButton.dataset.imgAlign);
    });

    imageSize.addEventListener('change', () => {
        if (!selectedImage) return;
        if (imageSize.value) {
            selectedImage.style.width = `${imageSize.value}%`;
            selectedImage.style.height = 'auto';
        } else {
            selectedImage.style.removeProperty('width');
            selectedImage.style.removeProperty('height');
        }
        positionImageBar();
        onContentChange();
    });

    imageDeleteBtn.addEventListener('click', deleteSelectedImage);

    imageReplaceBtn.addEventListener('click', () => {
        if (!selectedImage) return;
        imageReplaceInput.value = '';
        imageReplaceInput.click();
    });

    imageReplaceInput.addEventListener('change', () => {
        const file = imageReplaceInput.files && imageReplaceInput.files[0];
        if (!file || !selectedImage) return;
        const image = selectedImage;
        const reader = new FileReader();
        reader.addEventListener('load', () => {
            image.src = String(reader.result || '');
            image.alt = file.name || '';
            image.addEventListener('load', positionImageBar, { once: true });
            positionImageBar();
            onContentChange();
            toast('Imagen reemplazada');
        });
        reader.readAsDataURL(file);
    });

    $$('[data-close]').forEach((button) => {
        button.addEventListener('click', () => {
            const modal = document.getElementById(button.dataset.close);
            if (modal) closeModal(modal);
        });
    });

    $('#linkClose').addEventListener('click', () => closeModal(linkModal));
    $('#imageClose').addEventListener('click', () => closeModal(imageModal));

    $$('.modal-layer').forEach((layer) => {
        layer.addEventListener('mousedown', (event) => {
            if (event.target === layer) closeModal(layer);
        });
    });

    editor.addEventListener('input', onContentChange);
    editor.addEventListener('keyup', refreshToolbar);
    editor.addEventListener('mouseup', () => {
        saveSelection();
        refreshToolbar();
    });
    editor.addEventListener('focus', refreshToolbar);

    editor.addEventListener('click', (event) => {
        if (app.classList.contains('is-preview')) return;
        const link = event.target.closest('a');
        if (link && editor.contains(link) && link.getAttribute('href')) {
            event.preventDefault();
            clearImageSelection();
            window.open(link.href, '_blank', 'noopener,noreferrer');
            return;
        }
        const image = event.target.closest('img');
        if (image && editor.contains(image)) {
            selectImage(image);
        } else if (selectedImage) {
            clearImageSelection();
        }
    });

    editor.addEventListener('keydown', (event) => {
        if (selectedImage && (event.key === 'Delete' || event.key === 'Backspace')) {
            event.preventDefault();
            deleteSelectedImage();
            return;
        }
        if (event.key === 'Tab') {
            event.preventDefault();
            document.execCommand('insertHTML', false, '&nbsp;&nbsp;&nbsp;&nbsp;');
            onContentChange();
        }
    });

    editor.addEventListener('paste', (event) => {
        const items = event.clipboardData ? Array.from(event.clipboardData.items) : [];
        const imageItem = items.find((item) => item.type && item.type.startsWith('image/'));
        if (!imageItem) return;
        const file = imageItem.getAsFile();
        if (!file) return;
        event.preventDefault();
        saveSelection();
        insertImageFile(file);
    });

    ['dragenter', 'dragover'].forEach((type) => {
        editor.addEventListener(type, (event) => {
            if (event.dataTransfer && Array.from(event.dataTransfer.types || []).includes('Files')) {
                event.preventDefault();
            }
        });
    });

    editor.addEventListener('drop', (event) => {
        const files = Array.from(event.dataTransfer.files || []).filter((file) => file.type && file.type.startsWith('image/'));
        if (!files.length) return;
        event.preventDefault();
        saveSelection();
        files.forEach((file) => insertImageFile(file));
    });

    document.addEventListener('selectionchange', () => {
        const selection = window.getSelection();
        if (!selection || !selection.rangeCount) return;
        if (editor.contains(selection.anchorNode)) {
            savedRange = selection.getRangeAt(0).cloneRange();
            refreshToolbar();
        }
    });

    docTitle.addEventListener('input', scheduleSave);
    docTitle.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            editor.focus();
        }
    });

    previewBtn.addEventListener('click', () => {
        setPreview(!app.classList.contains('is-preview'));
    });

    newBtn.addEventListener('click', () => {
        if (window.confirm('¿Crear un documento nuevo? Se reemplazará el contenido actual.')) {
            resetDocument('Documento sin título');
            toast('Documento nuevo');
        }
    });

    clearBtn.addEventListener('click', () => {
        if (window.confirm('¿Vaciar el documento? Esta acción no se puede deshacer.')) {
            resetDocument('Documento sin título');
            toast('Documento vaciado');
        }
    });

    copyBtn.addEventListener('click', copyHtml);
    downloadBtn.addEventListener('click', downloadHtml);
    printBtn.addEventListener('click', () => window.print());

    document.addEventListener('keydown', (event) => {
        const modifier = event.ctrlKey || event.metaKey;
        if (modifier && event.key.toLowerCase() === 's') {
            event.preventDefault();
            if (saveNow()) toast('Documento guardado');
        }
        if (event.key === 'Escape') {
            closePopovers();
            closeModals();
            clearImageSelection();
        }
    });

    window.addEventListener('beforeunload', () => {
        window.clearTimeout(saveTimer);
        try {
            localStorage.setItem(STORAGE.title, docTitle.value);
            localStorage.setItem(STORAGE.content, editor.innerHTML);
            localStorage.setItem(STORAGE.savedAt, new Date().toISOString());
        } catch (error) {
        }
    });

    document.execCommand('defaultParagraphSeparator', false, 'p');
    document.execCommand('styleWithCSS', false, true);

    let storedTitle = null;
    let storedContent = null;
    let storedDate = null;
    try {
        storedTitle = localStorage.getItem(STORAGE.title);
        storedContent = localStorage.getItem(STORAGE.content);
        storedDate = localStorage.getItem(STORAGE.savedAt);
    } catch (error) {
        storedTitle = null;
        storedContent = null;
    }

    docTitle.value = storedTitle || 'Documento sin título';
    editor.innerHTML = storedContent !== null ? storedContent : SAMPLE;
    prepareLinks();

    if (storedDate) {
        const date = new Date(storedDate);
        if (!Number.isNaN(date.getTime())) savedAt.textContent = formatTime(date);
    } else {
        saveLabel.textContent = 'Listo';
    }

    textColorSwatch.style.background = '#5b6977';
    highlightSwatch.style.background = '#e9edd7';

    updateStats();
    refreshToolbar();
})();
