(function (global) {
    'use strict';

    const TEXT_COLORS = [
        '#2f3237', '#5b6977', '#6f7d8c', '#7d8f7a', '#5f7d7a', '#8a7f9c',
        '#b08a6a', '#a9736d', '#7c828a', '#456b6a', '#7a6a55', '#9a8a5f'
    ];

    const HIGHLIGHTS = [
        '#f5e7c8', '#e9edd7', '#dfeaf1', '#f2dfe0', '#ece5f2', '#f7ecdc',
        '#e3e9e2', '#efe9df', '#e8e6f0', '#e1eceb', '#f3e4d6', '#eaeadf'
    ];

    const FONT_FAMILIES = [
        { label: 'Georgia', value: 'Georgia, serif' },
        { label: 'Palatino', value: "'Palatino Linotype', Palatino, serif" },
        { label: 'Times New Roman', value: "'Times New Roman', Times, serif" },
        { label: 'Garamond', value: "Garamond, 'EB Garamond', serif" },
        { label: 'Arial', value: 'Arial, Helvetica, sans-serif' },
        { label: 'Segoe UI', value: "'Segoe UI', system-ui, sans-serif" },
        { label: 'Verdana', value: 'Verdana, Geneva, sans-serif' },
        { label: 'Trebuchet MS', value: "'Trebuchet MS', sans-serif" },
        { label: 'Courier New', value: "'Courier New', Courier, monospace" },
        { label: 'Consolas', value: "Consolas, 'Cascadia Code', monospace" }
    ];

    const FONT_SIZES = [12, 14, 16, 18, 20, 24, 28, 32, 36, 48];

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
            .replace(/[̀-ͯ]/g, '')
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

    class Wysing {
        constructor(container, options) {
            const opts = options || {};
            const target = typeof container === 'string' ? document.querySelector(container) : container;
            if (!target) throw new Error('Wysing: el contenedor no existe.');

            this._container = target;
            this._options = {
                title: 'Documento sin título',
                content: '',
                theme: 'dark',
                placeholder: 'Empieza a escribir…',
                persistence: false,
                storageKey: 'wysing',
                onChange: null,
                spellcheck: true,
                ...opts
            };

            this._uid = `wysing-${Math.random().toString(36).slice(2, 9)}`;
            this._theme = 'dark';
            this._changeCallbacks = [];
            this._savedRange = null;
            this._selectedImage = null;
            this._changeTimer = 0;
            this._toastTimer = 0;
            this._destroyed = false;
            this._docListeners = [];
            this._winListeners = [];

            if (typeof this._options.onChange === 'function') this._changeCallbacks.push(this._options.onChange);

            try {
                document.execCommand('defaultParagraphSeparator', false, 'p');
                document.execCommand('styleWithCSS', false, true);
            } catch (error) {
            }

            this._buildDOM();
            this._cacheElements();
            this._initSwatches();
            this._initDropdowns();
            this._bindEvents();
            this._applyTheme(this._options.theme);

            let title = this._options.title;
            let content = this._options.content;
            let savedAt = null;
            if (this._options.persistence) {
                try {
                    const storedTitle = localStorage.getItem(this._key('title'));
                    const storedContent = localStorage.getItem(this._key('content'));
                    const storedDate = localStorage.getItem(this._key('savedAt'));
                    if (storedTitle !== null) title = storedTitle;
                    if (storedContent !== null) content = storedContent;
                    savedAt = storedDate;
                } catch (error) {
                }
            }

            this._setTitleInternal(title);
            this._setContentInternal(content);
            if (savedAt) {
                const date = new Date(savedAt);
                if (!Number.isNaN(date.getTime())) this._el.savedAt.textContent = formatTime(date);
            } else {
                this._el.saveLabel.textContent = 'Listo';
            }

            this._el.textColorSwatch.style.background = '#5b6977';
            this._el.highlightSwatch.style.background = '#e9edd7';

            this._updateStats();
            this._refreshToolbar();
        }

        getContent() {
            return this._el.editor.innerHTML;
        }

        setContent(html) {
            this._setContentInternal(html == null ? '' : String(html));
            this._refreshToolbar();
            this._flushChange();
            return this;
        }

        getTitle() {
            return this._el.title.value;
        }

        setTitle(text) {
            this._setTitleInternal(text == null ? '' : String(text));
            this._flushChange();
            return this;
        }

        onChange(callback) {
            if (typeof callback === 'function') this._changeCallbacks.push(callback);
            return this;
        }

        setTheme(theme) {
            this._applyTheme(theme);
            return this;
        }

        getTheme() {
            return this._theme;
        }

        focus() {
            this._el.editor.focus();
            return this;
        }

        setPreview(enabled) {
            this._setPreview(Boolean(enabled));
            return this;
        }

        isPreview() {
            return this.root.classList.contains('is-preview');
        }

        clear() {
            this._resetDocument(this._options.title || 'Documento sin título');
            this._flushChange();
            return this;
        }

        save() {
            return this._saveNow();
        }

        getStats() {
            const text = this._el.editor.innerText.replace(/ /g, ' ').trim();
            const words = text ? text.split(/\s+/).length : 0;
            const chars = text.length;
            const minutes = Math.max(1, Math.ceil(words / 200));
            return { words, chars, minutes };
        }

        destroy() {
            if (this._destroyed) return;
            this._destroyed = true;
            window.clearTimeout(this._changeTimer);
            window.clearTimeout(this._toastTimer);
            this._docListeners.forEach(({ target, type, fn, opts }) => target.removeEventListener(type, fn, opts));
            this._winListeners.forEach(({ target, type, fn, opts }) => target.removeEventListener(type, fn, opts));
            this._docListeners = [];
            this._winListeners = [];
            if (this.root && this.root.parentNode) this.root.parentNode.removeChild(this.root);
            this._el = null;
        }

        _key(name) {
            return `${this._options.storageKey}:${name}`;
        }

        _buildDOM() {
            const uid = this._uid;
            const placeholder = escapeAttr(this._options.placeholder);
            const spellcheck = this._options.spellcheck ? 'true' : 'false';

            const blockItems = [
                ['p', 'Párrafo'], ['h1', 'Título 1'], ['h2', 'Título 2'],
                ['h3', 'Título 3'], ['blockquote', 'Cita'], ['pre', 'Código']
            ].map(([value, label], index) => (
                `<button class="dropdown__item${index === 0 ? ' is-active' : ''}" type="button" role="option" data-value="${value}">${label}</button>`
            )).join('');

            const familyItems = FONT_FAMILIES.map((font, index) => (
                `<button class="dropdown__item${index === 0 ? ' is-active' : ''}" type="button" role="option" data-value="${escapeAttr(font.value)}" style="font-family: ${escapeAttr(font.value)}">${escapeHtml(font.label)}</button>`
            )).join('');

            const sizeItems = FONT_SIZES.map((size) => (
                `<button class="dropdown__item${size === 16 ? ' is-active' : ''}" type="button" role="option" data-value="${size}">${size} px</button>`
            )).join('');

            const imageSizeItems = [
                ['', 'Tamaño original'], ['25', '25 %'], ['50', '50 %'], ['75', '75 %'], ['100', '100 %']
            ].map(([value, label], index) => (
                `<button class="dropdown__item${index === 0 ? ' is-active' : ''}" type="button" role="option" data-value="${value}">${label}</button>`
            )).join('');

            const html = `
<div class="wysing wysing--dark">
    <header class="topbar">
        <div class="brand">
            <span class="brand__mark">
                <span class="miller-icon" data-icon="pencil" aria-hidden="true"></span>
            </span>
            <span class="brand__text">
                <span class="brand__name">Wysing</span>
                <span class="brand__tag">Editor de texto</span>
            </span>
        </div>

        <div class="doc">
            <span class="miller-icon doc__icon" data-icon="file_text" aria-hidden="true"></span>
            <input class="doc__title" data-wysing="title" type="text" value="Documento sin título" aria-label="Título del documento" spellcheck="false">
            <span class="doc__state" data-wysing="save-state">
                <span class="miller-icon" data-icon="check" aria-hidden="true"></span>
                <span data-wysing="save-label">Guardado</span>
            </span>
        </div>

        <div class="topbar__actions">
            <button class="btn btn--icon" data-wysing="new-btn" type="button" title="Nuevo documento" aria-label="Nuevo documento">
                <span class="miller-icon" data-icon="file_add" aria-hidden="true"></span>
            </button>
            <button class="btn btn--ghost" data-wysing="preview-btn" type="button" aria-pressed="false" title="Vista previa de lectura">
                <span class="miller-icon" data-icon="eye" aria-hidden="true"></span>
                <span class="btn__label">Vista previa</span>
            </button>
            <button class="btn btn--ghost" data-wysing="copy-btn" type="button" title="Copiar HTML al portapapeles">
                <span class="miller-icon" data-icon="clipboard" aria-hidden="true"></span>
                <span class="btn__label">Copiar HTML</span>
            </button>
            <button class="btn btn--primary" data-wysing="download-btn" type="button" title="Descargar como archivo HTML">
                <span class="miller-icon" data-icon="download" aria-hidden="true"></span>
                <span class="btn__label">Descargar</span>
            </button>
        </div>
    </header>

    <div class="toolbar" data-wysing="toolbar" role="toolbar" aria-label="Herramientas de formato">
        <div class="toolbar__group">
            <button class="tool" type="button" data-cmd="undo" title="Deshacer (Ctrl+Z)" aria-label="Deshacer">
                <span class="miller-icon" data-icon="arrow_left" aria-hidden="true"></span>
            </button>
            <button class="tool" type="button" data-cmd="redo" title="Rehacer (Ctrl+Y)" aria-label="Rehacer">
                <span class="miller-icon" data-icon="arrow_right" aria-hidden="true"></span>
            </button>
        </div>

        <span class="toolbar__sep" aria-hidden="true"></span>

        <div class="toolbar__group">
            <span class="miller-icon toolbar__lead" data-icon="text_block" aria-hidden="true"></span>
            <div class="dropdown" data-wysing="block-dropdown">
                <button class="dropdown__trigger" type="button" aria-haspopup="listbox" aria-expanded="false" aria-label="Estilo de bloque">
                    <span class="dropdown__label">Párrafo</span>
                    <span class="miller-icon dropdown__caret" data-icon="arrow_down" aria-hidden="true"></span>
                </button>
                <div class="dropdown__menu" role="listbox" hidden>
                    ${blockItems}
                </div>
            </div>
        </div>

        <span class="toolbar__sep" aria-hidden="true"></span>

        <div class="toolbar__group">
            <div class="dropdown dropdown--wide" data-wysing="font-family-dropdown">
                <button class="dropdown__trigger" type="button" aria-haspopup="listbox" aria-expanded="false" aria-label="Tipografía">
                    <span class="dropdown__label">Georgia</span>
                    <span class="miller-icon dropdown__caret" data-icon="arrow_down" aria-hidden="true"></span>
                </button>
                <div class="dropdown__menu" role="listbox" hidden>
                    ${familyItems}
                </div>
            </div>
        </div>

        <span class="toolbar__sep" aria-hidden="true"></span>

        <div class="toolbar__group">
            <div class="dropdown" data-wysing="font-size-dropdown">
                <button class="dropdown__trigger" type="button" aria-haspopup="listbox" aria-expanded="false" aria-label="Tamaño de fuente">
                    <span class="dropdown__label">16 px</span>
                    <span class="miller-icon dropdown__caret" data-icon="arrow_down" aria-hidden="true"></span>
                </button>
                <div class="dropdown__menu" role="listbox" hidden>
                    ${sizeItems}
                </div>
            </div>
        </div>

        <span class="toolbar__sep" aria-hidden="true"></span>

        <div class="toolbar__group">
            <button class="tool" type="button" data-cmd="bold" title="Negrita (Ctrl+B)" aria-label="Negrita">
                <span class="tool__letter tool__letter--bold">B</span>
            </button>
            <button class="tool" type="button" data-cmd="italic" title="Cursiva (Ctrl+I)" aria-label="Cursiva">
                <span class="tool__letter tool__letter--italic">I</span>
            </button>
            <button class="tool" type="button" data-cmd="underline" title="Subrayado (Ctrl+U)" aria-label="Subrayado">
                <span class="tool__letter tool__letter--underline">U</span>
            </button>
            <button class="tool" type="button" data-cmd="strikeThrough" title="Tachado" aria-label="Tachado">
                <span class="tool__letter tool__letter--strike">S</span>
            </button>
        </div>

        <span class="toolbar__sep" aria-hidden="true"></span>

        <div class="toolbar__group">
            <div class="tool-wrap">
                <button class="tool" data-wysing="text-color-btn" type="button" title="Color de texto" aria-label="Color de texto" aria-haspopup="true" aria-expanded="false">
                    <span class="tool__letter tool__letter--color">A</span>
                    <span class="tool__swatch" data-wysing="text-color-swatch" aria-hidden="true"></span>
                </button>
                <div class="popover" data-wysing="text-color-pop" hidden>
                    <p class="popover__title">Color de texto</p>
                    <div class="swatches" data-wysing="text-color-swatches"></div>
                </div>
            </div>

            <div class="tool-wrap">
                <button class="tool" data-wysing="highlight-btn" type="button" title="Resaltado" aria-label="Resaltado" aria-haspopup="true" aria-expanded="false">
                    <span class="miller-icon" data-icon="brush" aria-hidden="true"></span>
                    <span class="tool__swatch tool__swatch--light" data-wysing="highlight-swatch" aria-hidden="true"></span>
                </button>
                <div class="popover" data-wysing="highlight-pop" hidden>
                    <p class="popover__title">Resaltado</p>
                    <div class="swatches" data-wysing="highlight-swatches"></div>
                    <button class="popover__clear" type="button" data-wysing="clear-highlight">Quitar resaltado</button>
                </div>
            </div>
        </div>

        <span class="toolbar__sep" aria-hidden="true"></span>

        <div class="toolbar__group">
            <button class="tool" type="button" data-cmd="justifyLeft" title="Alinear a la izquierda" aria-label="Alinear a la izquierda">
                <span class="miller-icon" data-icon="align_left" aria-hidden="true"></span>
            </button>
            <button class="tool" type="button" data-cmd="justifyCenter" title="Centrar" aria-label="Centrar">
                <span class="miller-icon" data-icon="align_center" aria-hidden="true"></span>
            </button>
            <button class="tool" type="button" data-cmd="justifyRight" title="Alinear a la derecha" aria-label="Alinear a la derecha">
                <span class="miller-icon" data-icon="align_right" aria-hidden="true"></span>
            </button>
            <button class="tool" type="button" data-cmd="justifyFull" title="Justificar" aria-label="Justificar">
                <span class="miller-icon" data-icon="align_justify" aria-hidden="true"></span>
            </button>
        </div>

        <span class="toolbar__sep" aria-hidden="true"></span>

        <div class="toolbar__group">
            <button class="tool" type="button" data-cmd="insertUnorderedList" title="Lista con viñetas" aria-label="Lista con viñetas">
                <span class="miller-icon" data-icon="list_settings" aria-hidden="true"></span>
            </button>
            <button class="tool" type="button" data-cmd="insertOrderedList" title="Lista numerada" aria-label="Lista numerada">
                <span class="tool__letter tool__letter--list">1.</span>
            </button>
        </div>

        <span class="toolbar__sep" aria-hidden="true"></span>

        <div class="toolbar__group">
            <button class="tool" data-wysing="link-btn" type="button" title="Insertar enlace" aria-label="Insertar enlace">
                <span class="miller-icon" data-icon="links" aria-hidden="true"></span>
            </button>
            <button class="tool" data-wysing="image-btn" type="button" title="Insertar imagen" aria-label="Insertar imagen">
                <span class="miller-icon" data-icon="image" aria-hidden="true"></span>
            </button>
            <button class="tool" type="button" data-cmd="insertHorizontalRule" title="Separador" aria-label="Separador">
                <span class="tool__letter tool__letter--rule">—</span>
            </button>
            <button class="tool" type="button" data-cmd="removeFormat" title="Quitar formato" aria-label="Quitar formato">
                <span class="miller-icon" data-icon="eraser" aria-hidden="true"></span>
            </button>
        </div>

        <span class="toolbar__spacer" aria-hidden="true"></span>

        <div class="toolbar__group">
            <button class="tool" data-wysing="print-btn" type="button" title="Imprimir" aria-label="Imprimir">
                <span class="miller-icon" data-icon="printer" aria-hidden="true"></span>
            </button>
            <button class="tool tool--danger" data-wysing="clear-btn" type="button" title="Vaciar documento" aria-label="Vaciar documento">
                <span class="miller-icon" data-icon="delete" aria-hidden="true"></span>
            </button>
        </div>
    </div>

    <main class="workspace" data-wysing="workspace">
        <div class="paper" data-wysing="paper">
            <article class="editor" data-wysing="editor" contenteditable="true" spellcheck="${spellcheck}" data-placeholder="${placeholder}" aria-label="Área de edición"></article>
        </div>
    </main>

    <footer class="statusbar">
        <div class="statusbar__side">
            <span class="statusbar__item">
                <span class="miller-icon" data-icon="history" aria-hidden="true"></span>
                Guardado automático
            </span>
            <span class="statusbar__dot" aria-hidden="true"></span>
            <span data-wysing="word-count">0 palabras</span>
            <span class="statusbar__dot" aria-hidden="true"></span>
            <span data-wysing="char-count">0 caracteres</span>
        </div>
        <div class="statusbar__side">
            <span data-wysing="read-time">1 min de lectura</span>
            <span class="statusbar__dot" aria-hidden="true"></span>
            <span class="statusbar__item">
                <span class="miller-icon" data-icon="time" aria-hidden="true"></span>
                <span data-wysing="saved-at">Sin cambios</span>
            </span>
        </div>
    </footer>

    <div class="modal-layer" data-wysing="link-modal" hidden>
        <div class="modal" role="dialog" aria-modal="true" aria-labelledby="${uid}-link-title">
            <header class="modal__head">
                <div class="modal__heading">
                    <span class="modal__icon"><span class="miller-icon" data-icon="links" aria-hidden="true"></span></span>
                    <div>
                        <h2 id="${uid}-link-title">Insertar enlace</h2>
                        <p>Conecta tu texto con otra página.</p>
                    </div>
                </div>
                <button class="tool" type="button" data-wysing="link-close" aria-label="Cerrar">
                    <span class="miller-icon" data-icon="close" aria-hidden="true"></span>
                </button>
            </header>
            <div class="field">
                <label for="${uid}-link-text">Texto</label>
                <input type="text" id="${uid}-link-text" data-wysing="link-text" placeholder="Texto visible del enlace">
            </div>
            <div class="field">
                <label for="${uid}-link-url">URL</label>
                <input type="url" id="${uid}-link-url" data-wysing="link-url" placeholder="https://ejemplo.com">
            </div>
            <footer class="modal__foot">
                <button class="btn btn--ghost" type="button" data-wysing-close="link">Cancelar</button>
                <button class="btn btn--primary" type="button" data-wysing="link-save">Insertar enlace</button>
            </footer>
        </div>
    </div>

    <div class="modal-layer" data-wysing="image-modal" hidden>
        <div class="modal" role="dialog" aria-modal="true" aria-labelledby="${uid}-image-title">
            <header class="modal__head">
                <div class="modal__heading">
                    <span class="modal__icon"><span class="miller-icon" data-icon="image" aria-hidden="true"></span></span>
                    <div>
                        <h2 id="${uid}-image-title">Insertar imagen</h2>
                        <p>Desde una URL o un archivo local.</p>
                    </div>
                </div>
                <button class="tool" type="button" data-wysing="image-close" aria-label="Cerrar">
                    <span class="miller-icon" data-icon="close" aria-hidden="true"></span>
                </button>
            </header>
            <div class="field">
                <label for="${uid}-image-url">URL de la imagen</label>
                <input type="url" id="${uid}-image-url" data-wysing="image-url" placeholder="https://ejemplo.com/imagen.jpg">
            </div>
            <div class="modal__divider"><span>o</span></div>
            <button class="btn btn--soft btn--wide" type="button" data-wysing="pick-image">
                <span class="miller-icon" data-icon="upload" aria-hidden="true"></span>
                Elegir una imagen de tu dispositivo
            </button>
            <footer class="modal__foot">
                <button class="btn btn--ghost" type="button" data-wysing-close="image">Cancelar</button>
                <button class="btn btn--primary" type="button" data-wysing="image-save">Insertar imagen</button>
            </footer>
        </div>
    </div>

    <input type="file" data-wysing="image-input" accept="image/*" hidden>
    <input type="file" data-wysing="image-replace-input" accept="image/*" hidden>

    <div class="image-bar" data-wysing="image-bar" role="toolbar" aria-label="Opciones de imagen" hidden>
        <div class="image-bar__group">
            <button class="tool" type="button" data-img-align="left" title="Alinear a la izquierda" aria-label="Alinear imagen a la izquierda">
                <span class="miller-icon" data-icon="align_left" aria-hidden="true"></span>
            </button>
            <button class="tool" type="button" data-img-align="center" title="Centrar imagen" aria-label="Centrar imagen">
                <span class="miller-icon" data-icon="align_center" aria-hidden="true"></span>
            </button>
            <button class="tool" type="button" data-img-align="right" title="Alinear a la derecha" aria-label="Alinear imagen a la derecha">
                <span class="miller-icon" data-icon="align_right" aria-hidden="true"></span>
            </button>
        </div>
        <span class="image-bar__sep" aria-hidden="true"></span>
        <div class="image-bar__size">
            <div class="dropdown dropdown--sm" data-wysing="image-size-dropdown">
                <button class="dropdown__trigger" type="button" aria-haspopup="listbox" aria-expanded="false" aria-label="Tamaño de la imagen">
                    <span class="dropdown__label">Tamaño original</span>
                    <span class="miller-icon dropdown__caret" data-icon="arrow_down" aria-hidden="true"></span>
                </button>
                <div class="dropdown__menu" role="listbox" hidden>
                    ${imageSizeItems}
                </div>
            </div>
        </div>
        <span class="image-bar__sep" aria-hidden="true"></span>
        <button class="tool" data-wysing="image-replace" type="button" title="Reemplazar imagen" aria-label="Reemplazar imagen">
            <span class="miller-icon" data-icon="upload" aria-hidden="true"></span>
        </button>
        <button class="tool tool--danger" data-wysing="image-delete" type="button" title="Eliminar imagen" aria-label="Eliminar imagen">
            <span class="miller-icon" data-icon="delete" aria-hidden="true"></span>
        </button>
    </div>

    <div class="toast" data-wysing="toast" role="status" aria-live="polite"></div>
</div>`;

            this._container.innerHTML = html;
            this.root = this._container.firstElementChild;
        }

        _cacheElements() {
            const $ = (selector) => this.root.querySelector(selector);
            this._el = {
                editor: $('[data-wysing="editor"]'),
                title: $('[data-wysing="title"]'),
                saveState: $('[data-wysing="save-state"]'),
                saveLabel: $('[data-wysing="save-label"]'),
                savedAt: $('[data-wysing="saved-at"]'),
                wordCount: $('[data-wysing="word-count"]'),
                charCount: $('[data-wysing="char-count"]'),
                readTime: $('[data-wysing="read-time"]'),
                toolbar: $('[data-wysing="toolbar"]'),
                workspace: $('[data-wysing="workspace"]'),
                textColorBtn: $('[data-wysing="text-color-btn"]'),
                textColorPop: $('[data-wysing="text-color-pop"]'),
                textColorSwatches: $('[data-wysing="text-color-swatches"]'),
                textColorSwatch: $('[data-wysing="text-color-swatch"]'),
                highlightBtn: $('[data-wysing="highlight-btn"]'),
                highlightPop: $('[data-wysing="highlight-pop"]'),
                highlightSwatches: $('[data-wysing="highlight-swatches"]'),
                highlightSwatch: $('[data-wysing="highlight-swatch"]'),
                clearHighlight: $('[data-wysing="clear-highlight"]'),
                linkBtn: $('[data-wysing="link-btn"]'),
                imageBtn: $('[data-wysing="image-btn"]'),
                linkModal: $('[data-wysing="link-modal"]'),
                linkText: $('[data-wysing="link-text"]'),
                linkUrl: $('[data-wysing="link-url"]'),
                linkSave: $('[data-wysing="link-save"]'),
                linkClose: $('[data-wysing="link-close"]'),
                imageModal: $('[data-wysing="image-modal"]'),
                imageUrl: $('[data-wysing="image-url"]'),
                imageSave: $('[data-wysing="image-save"]'),
                imageClose: $('[data-wysing="image-close"]'),
                pickImageBtn: $('[data-wysing="pick-image"]'),
                imageInput: $('[data-wysing="image-input"]'),
                imageReplaceInput: $('[data-wysing="image-replace-input"]'),
                imageBar: $('[data-wysing="image-bar"]'),
                imageDeleteBtn: $('[data-wysing="image-delete"]'),
                imageReplaceBtn: $('[data-wysing="image-replace"]'),
                previewBtn: $('[data-wysing="preview-btn"]'),
                newBtn: $('[data-wysing="new-btn"]'),
                copyBtn: $('[data-wysing="copy-btn"]'),
                downloadBtn: $('[data-wysing="download-btn"]'),
                printBtn: $('[data-wysing="print-btn"]'),
                clearBtn: $('[data-wysing="clear-btn"]'),
                toast: $('[data-wysing="toast"]'),
                blockDropdown: $('[data-wysing="block-dropdown"]'),
                fontFamilyDropdown: $('[data-wysing="font-family-dropdown"]'),
                fontSizeDropdown: $('[data-wysing="font-size-dropdown"]'),
                imageSizeDropdown: $('[data-wysing="image-size-dropdown"]')
            };
        }

        _applyTheme(theme) {
            const next = theme === 'light' ? 'light' : 'dark';
            this._theme = next;
            this.root.classList.remove('wysing--dark', 'wysing--light');
            this.root.classList.add(`wysing--${next}`);
        }

        _setTitleInternal(text) {
            this._el.title.value = text;
        }

        _setContentInternal(html) {
            this._clearImageSelection();
            this._savedRange = null;
            this._el.editor.innerHTML = html;
            this._prepareLinks();
            this._updateStats();
        }

        _toast(message) {
            const toastEl = this._el.toast;
            toastEl.textContent = message;
            toastEl.classList.add('is-visible');
            window.clearTimeout(this._toastTimer);
            this._toastTimer = window.setTimeout(() => {
                toastEl.classList.remove('is-visible');
            }, 2400);
        }

        _setSaveState(saving) {
            this._el.saveState.classList.toggle('is-saving', Boolean(saving));
            this._el.saveLabel.textContent = saving ? 'Guardando…' : 'Guardado';
        }

        _saveSelection() {
            const selection = window.getSelection();
            if (!selection || !selection.rangeCount) return;
            const range = selection.getRangeAt(0);
            if (this._el.editor.contains(range.commonAncestorContainer)) {
                this._savedRange = range.cloneRange();
            }
        }

        _restoreSelection() {
            if (!this._savedRange) return;
            const selection = window.getSelection();
            if (!selection) return;
            selection.removeAllRanges();
            selection.addRange(this._savedRange);
        }

        _updateStats() {
            const { words, chars, minutes } = this.getStats();
            this._el.wordCount.textContent = `${words} ${words === 1 ? 'palabra' : 'palabras'}`;
            this._el.charCount.textContent = `${chars} ${chars === 1 ? 'carácter' : 'caracteres'}`;
            this._el.readTime.textContent = `${minutes} min de lectura`;
        }

        _emitChange() {
            const html = this._el.editor.innerHTML;
            const title = this._el.title.value;
            this._changeCallbacks.forEach((callback) => {
                try {
                    callback(html, title);
                } catch (error) {
                }
            });
        }

        _flushChange() {
            window.clearTimeout(this._changeTimer);
            this._saveNow();
        }

        _scheduleChange() {
            this._setSaveState(true);
            window.clearTimeout(this._changeTimer);
            this._changeTimer = window.setTimeout(() => this._saveNow(), 300);
        }

        _saveNow() {
            window.clearTimeout(this._changeTimer);
            let ok = true;
            if (this._options.persistence) {
                try {
                    const now = new Date();
                    localStorage.setItem(this._key('title'), this._el.title.value);
                    localStorage.setItem(this._key('content'), this._el.editor.innerHTML);
                    localStorage.setItem(this._key('savedAt'), now.toISOString());
                    this._el.savedAt.textContent = formatTime(now);
                    this._setSaveState(false);
                } catch (error) {
                    ok = false;
                    this._setSaveState(false);
                    this._toast('No se pudo guardar: el documento es demasiado grande.');
                }
            } else {
                this._el.savedAt.textContent = formatTime(new Date());
                this._setSaveState(false);
            }
            this._emitChange();
            return ok;
        }

        _prepareLinks() {
            this.$$('a', this._el.editor).forEach((link) => {
                if (!link.getAttribute('href')) return;
                if (link.getAttribute('target') !== '_blank') link.setAttribute('target', '_blank');
                if (link.getAttribute('rel') !== 'noopener noreferrer') link.setAttribute('rel', 'noopener noreferrer');
            });
        }

        $$(selector, root) {
            return Array.from((root || this.root).querySelectorAll(selector));
        }

        $(selector, root) {
            return (root || this.root).querySelector(selector);
        }

        _onContentChange() {
            if (this._selectedImage && !this._selectedImage.isConnected) this._clearImageSelection();
            this._prepareLinks();
            this._updateStats();
            this._scheduleChange();
            this._refreshToolbar();
        }

        _refreshToolbar() {
            this.$$('[data-cmd]', this._el.toolbar).forEach((button) => {
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
            this._dropdowns.block.value = ['h1', 'h2', 'h3', 'blockquote', 'pre'].includes(block) ? block : 'p';

            try {
                const color = document.queryCommandValue('foreColor');
                if (color) this._el.textColorSwatch.style.background = color;
            } catch (error) {
            }

            this._refreshFontSizeLabel();
            this._refreshFontFamilyLabel();
        }

        _closePopovers() {
            this.$$('.popover').forEach((popover) => {
                popover.hidden = true;
            });
            [this._el.textColorBtn, this._el.highlightBtn].forEach((button) => {
                button.setAttribute('aria-expanded', 'false');
            });
        }

        _positionPopover(popover, anchor) {
            const rect = anchor.getBoundingClientRect();
            const width = popover.offsetWidth || 214;
            const margin = 10;
            const left = Math.max(margin, Math.min(rect.left + rect.width / 2 - width / 2, window.innerWidth - width - margin));
            popover.style.left = `${Math.round(left)}px`;
            popover.style.top = `${Math.round(rect.bottom + 10)}px`;
        }

        _closeDropdowns(except) {
            this.$$('.dropdown').forEach((root) => {
                if (root === except) return;
                root.classList.remove('is-open');
                const menu = root.querySelector('.dropdown__menu');
                const trigger = root.querySelector('.dropdown__trigger');
                if (menu) menu.hidden = true;
                if (trigger) trigger.setAttribute('aria-expanded', 'false');
            });
        }

        _createDropdown(root, onChange) {
            const trigger = root.querySelector('.dropdown__trigger');
            const label = root.querySelector('.dropdown__label');
            const menu = root.querySelector('.dropdown__menu');
            const items = Array.from(root.querySelectorAll('.dropdown__item'));
            const activeItem = items.find((item) => item.classList.contains('is-active'));
            let value = activeItem ? activeItem.dataset.value : '';

            const setValue = (next, silent) => {
                value = next;
                let matched = false;
                items.forEach((item) => {
                    const active = item.dataset.value === next;
                    item.classList.toggle('is-active', active);
                    if (active) {
                        matched = true;
                        label.textContent = item.textContent.trim();
                    }
                });
                if (!matched && items.length) {
                    items[0].classList.add('is-active');
                    label.textContent = items[0].textContent.trim();
                    value = items[0].dataset.value;
                }
                if (!silent && typeof onChange === 'function') onChange(value);
            };

            const close = () => {
                menu.hidden = true;
                root.classList.remove('is-open');
                trigger.setAttribute('aria-expanded', 'false');
            };

            const open = () => {
                this._closeDropdowns(root);
                menu.hidden = false;
                root.classList.add('is-open');
                trigger.setAttribute('aria-expanded', 'true');
                const rect = trigger.getBoundingClientRect();
                const width = Math.max(rect.width, menu.offsetWidth);
                const margin = 8;
                const left = Math.max(margin, Math.min(rect.left, window.innerWidth - width - margin));
                const spaceBelow = window.innerHeight - rect.bottom;
                const menuHeight = menu.offsetHeight;
                const top = spaceBelow >= menuHeight + 10 ? rect.bottom + 6 : rect.top - menuHeight - 6;
                menu.style.left = `${Math.round(left)}px`;
                menu.style.top = `${Math.round(Math.max(margin, top))}px`;
                menu.style.minWidth = `${Math.round(rect.width)}px`;
            };

            trigger.addEventListener('click', () => {
                if (menu.hidden) open();
                else close();
            });

            items.forEach((item) => {
                item.addEventListener('click', () => {
                    setValue(item.dataset.value);
                    close();
                });
            });

            root.addEventListener('keydown', (event) => {
                if (event.key === 'Escape' && !menu.hidden) {
                    event.preventDefault();
                    event.stopPropagation();
                    close();
                    trigger.focus();
                }
            });

            return {
                get value() { return value; },
                set value(next) { setValue(next, true); },
                open,
                close
            };
        }

        _closeModal(modal) {
            modal.hidden = true;
        }

        _closeModals() {
            this.$$('.modal-layer').forEach((modal) => {
                modal.hidden = true;
            });
        }

        _openModal(modal) {
            this._closeModals();
            this._closePopovers();
            modal.hidden = false;
        }

        _insertHtml(html) {
            this._el.editor.focus();
            this._restoreSelection();
            document.execCommand('insertHTML', false, html);
            this._onContentChange();
        }

        _insertImageSrc(src, alt) {
            const token = `wysing-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
            this._insertHtml(`<img src="${escapeAttr(src)}" alt="${escapeAttr(alt || '')}" data-wysing-token="${token}">`);
            const image = this._el.editor.querySelector(`img[data-wysing-token="${token}"]`);
            if (!image) return;
            image.removeAttribute('data-wysing-token');
            this._applyImageAlignment(image, 'left');
            this._selectImage(image);
        }

        _insertImageFile(file, done) {
            if (!file || !file.type || !file.type.startsWith('image/')) return;
            const reader = new FileReader();
            reader.addEventListener('load', () => {
                this._insertImageSrc(String(reader.result || ''), file.name || '');
                if (typeof done === 'function') done();
            });
            reader.readAsDataURL(file);
        }

        _getImageAlignment(image) {
            return image.dataset.align || 'left';
        }

        _updateImageBar() {
            this.$$('[data-img-align]', this._el.imageBar).forEach((button) => {
                button.classList.toggle('is-active', Boolean(this._selectedImage) && button.dataset.imgAlign === this._getImageAlignment(this._selectedImage));
            });
            const width = this._selectedImage ? this._selectedImage.style.width || '' : '';
            this._dropdowns.imageSize.value = /^\d+%$/.test(width) ? width.replace('%', '') : '';
        }

        _clearImageSelection() {
            if (this._selectedImage) this._selectedImage.classList.remove('is-selected');
            this._selectedImage = null;
            this._el.imageBar.hidden = true;
        }

        _positionImageBar() {
            if (!this._selectedImage || !this._selectedImage.isConnected) {
                this._clearImageSelection();
                return;
            }
            this._el.imageBar.hidden = false;
            const rect = this._selectedImage.getBoundingClientRect();
            if (rect.bottom < 4 || rect.top > window.innerHeight - 4) {
                this._el.imageBar.hidden = true;
                return;
            }
            const bar = this._el.imageBar.getBoundingClientRect();
            const gap = 10;
            const margin = 8;
            const top = rect.top - bar.height - gap >= margin ? rect.top - bar.height - gap : rect.bottom + gap;
            const left = Math.max(margin, Math.min(rect.left + rect.width / 2 - bar.width / 2, window.innerWidth - bar.width - margin));
            this._el.imageBar.style.left = `${Math.round(left)}px`;
            this._el.imageBar.style.top = `${Math.round(top)}px`;
        }

        _selectImage(image) {
            if (this._selectedImage && this._selectedImage !== image) this._selectedImage.classList.remove('is-selected');
            this._selectedImage = image;
            image.classList.add('is-selected');
            this._updateImageBar();
            this._positionImageBar();
        }

        _applyImageAlignment(image, align) {
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
            this._updateImageBar();
            this._positionImageBar();
            this._onContentChange();
        }

        _deleteSelectedImage() {
            if (!this._selectedImage) return;
            const image = this._selectedImage;
            this._clearImageSelection();
            image.remove();
            this._onContentChange();
        }

        _buildSwatches(container, colors, onPick) {
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

        _applyColor(command, color) {
            this._el.editor.focus();
            this._restoreSelection();
            document.execCommand('styleWithCSS', false, true);
            document.execCommand(command, false, color);
            this._onContentChange();
            this._closePopovers();
        }

        _setPreview(enabled) {
            this.root.classList.toggle('is-preview', enabled);
            this._el.previewBtn.classList.toggle('is-active', enabled);
            this._el.previewBtn.setAttribute('aria-pressed', String(enabled));
            this._el.editor.contentEditable = enabled ? 'false' : 'true';
            const icon = this._el.previewBtn.querySelector('.miller-icon');
            const label = this._el.previewBtn.querySelector('.btn__label');
            if (icon) icon.dataset.icon = enabled ? 'pencil' : 'eye';
            if (label) label.textContent = enabled ? 'Volver a editar' : 'Vista previa';
            this._el.previewBtn.title = enabled ? 'Volver a editar' : 'Vista previa de lectura';
            this._closePopovers();
            this._closeModals();
            this._clearImageSelection();
            if (!enabled) this._el.editor.focus();
        }

        _resetDocument(nextTitle) {
            if (this.root.classList.contains('is-preview')) this._setPreview(false);
            this._clearImageSelection();
            this._el.editor.innerHTML = '';
            this._el.title.value = nextTitle;
            this._savedRange = null;
            this._updateStats();
            this._saveNow();
            this._el.editor.focus();
        }

        _buildExportHtml() {
            const title = escapeHtml(this._el.title.value.trim() || 'Documento sin título');
            const body = this._el.editor.innerHTML;
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

        async _copyHtml() {
            const html = this._el.editor.innerHTML;
            try {
                await navigator.clipboard.writeText(html);
                this._toast('HTML copiado al portapapeles');
            } catch (error) {
                const helper = document.createElement('textarea');
                helper.value = html;
                helper.style.position = 'fixed';
                helper.style.opacity = '0';
                document.body.appendChild(helper);
                helper.select();
                try {
                    document.execCommand('copy');
                    this._toast('HTML copiado al portapapeles');
                } catch (fallbackError) {
                    this._toast('No se pudo copiar el HTML');
                }
                helper.remove();
            }
        }

        _downloadHtml() {
            const blob = new Blob([this._buildExportHtml()], { type: 'text/html;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${slugify(this._el.title.value)}.html`;
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.setTimeout(() => URL.revokeObjectURL(url), 2000);
            this._toast('Documento descargado');
        }

        _openImageModal() {
            this._saveSelection();
            this._el.imageUrl.value = '';
            this._openModal(this._el.imageModal);
            this._el.imageUrl.focus();
        }

        _applyLink() {
            const url = normalizeUrl(this._el.linkUrl.value);
            const text = this._el.linkText.value.trim();
            if (!url) {
                this._el.linkUrl.focus();
                return;
            }
            const hasSelection = this._savedRange && !this._savedRange.collapsed;
            if (text) {
                this._insertHtml(`<a href="${escapeAttr(url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(text)}</a>`);
            } else if (hasSelection) {
                this._el.editor.focus();
                this._restoreSelection();
                document.execCommand('styleWithCSS', false, true);
                document.execCommand('createLink', false, url);
                this._onContentChange();
            } else {
                this._insertHtml(`<a href="${escapeAttr(url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(url)}</a>`);
            }
            this._closeModal(this._el.linkModal);
            this._toast('Enlace insertado');
        }

        _applyImageUrl() {
            const url = normalizeUrl(this._el.imageUrl.value);
            if (!url) {
                this._el.imageUrl.focus();
                return;
            }
            this._insertImageSrc(url);
            this._closeModal(this._el.imageModal);
            this._toast('Imagen insertada');
        }

        _applyFontSize(px) {
            const selection = window.getSelection();
            if (!selection || selection.isCollapsed || !selection.rangeCount) return;
            const range = selection.getRangeAt(0);
            if (!this._el.editor.contains(range.commonAncestorContainer)) return;
            const span = document.createElement('span');
            span.style.fontSize = `${px}px`;
            try {
                range.surroundContents(span);
            } catch (error) {
                const fragment = range.extractContents();
                span.appendChild(fragment);
                range.insertNode(span);
            }
            const newRange = document.createRange();
            newRange.selectNodeContents(span);
            selection.removeAllRanges();
            selection.addRange(newRange);
            this._onContentChange();
        }

        _getSelectionFontSize() {
            const selection = window.getSelection();
            if (!selection || !selection.rangeCount) return '';
            let node = selection.anchorNode;
            if (node && node.nodeType === 3) node = node.parentElement;
            if (!node || !this._el.editor.contains(node)) return '';
            let el = node;
            while (el && el !== this._el.editor) {
                if (el.style && el.style.fontSize) {
                    const px = parseFloat(el.style.fontSize);
                    if (px) return String(Math.round(px));
                }
                el = el.parentElement;
            }
            const computed = window.getComputedStyle(node).fontSize;
            return computed ? String(Math.round(parseFloat(computed))) : '';
        }

        _refreshFontSizeLabel() {
            const px = this._getSelectionFontSize();
            const label = this._el.fontSizeDropdown.querySelector('.dropdown__label');
            const items = Array.from(this._el.fontSizeDropdown.querySelectorAll('.dropdown__item'));
            items.forEach((item) => item.classList.toggle('is-active', item.dataset.value === px));
            label.textContent = px ? `${px} px` : '16 px';
            if (!px) {
                const def = items.find((item) => item.dataset.value === '16');
                if (def) def.classList.add('is-active');
            }
        }

        _applyFontFamily(family) {
            const selection = window.getSelection();
            if (!selection || selection.isCollapsed || !selection.rangeCount) return;
            const range = selection.getRangeAt(0);
            if (!this._el.editor.contains(range.commonAncestorContainer)) return;
            const span = document.createElement('span');
            span.style.fontFamily = family;
            try {
                range.surroundContents(span);
            } catch (error) {
                const fragment = range.extractContents();
                span.appendChild(fragment);
                range.insertNode(span);
            }
            const newRange = document.createRange();
            newRange.selectNodeContents(span);
            selection.removeAllRanges();
            selection.addRange(newRange);
            this._onContentChange();
        }

        _getSelectionFontFamily() {
            const selection = window.getSelection();
            if (!selection || !selection.rangeCount) return '';
            let node = selection.anchorNode;
            if (node && node.nodeType === 3) node = node.parentElement;
            if (!node || !this._el.editor.contains(node)) return '';
            let el = node;
            while (el && el !== this._el.editor) {
                if (el.style && el.style.fontFamily) return el.style.fontFamily;
                el = el.parentElement;
            }
            return '';
        }

        _refreshFontFamilyLabel() {
            const family = this._getSelectionFontFamily();
            const label = this._el.fontFamilyDropdown.querySelector('.dropdown__label');
            const items = Array.from(this._el.fontFamilyDropdown.querySelectorAll('.dropdown__item'));
            let matched = false;
            items.forEach((item) => {
                const isActive = family && item.dataset.value && family === item.dataset.value;
                item.classList.toggle('is-active', Boolean(isActive));
                if (isActive) {
                    matched = true;
                    label.textContent = item.textContent.trim();
                }
            });
            if (!matched) {
                label.textContent = 'Georgia';
                const def = items.find((item) => item.textContent.trim() === 'Georgia');
                if (def) def.classList.add('is-active');
            }
        }

        _initSwatches() {
            this._buildSwatches(this._el.textColorSwatches, TEXT_COLORS, (color) => {
                this._el.textColorSwatch.style.background = color;
                this._applyColor('foreColor', color);
            });

            this._buildSwatches(this._el.highlightSwatches, HIGHLIGHTS, (color) => {
                this._el.highlightSwatch.style.background = color;
                this._applyColor('hiliteColor', color);
            });
        }

        _initDropdowns() {
            this._dropdowns = {
                block: this._createDropdown(this._el.blockDropdown, (tag) => {
                    this._el.editor.focus();
                    this._restoreSelection();
                    document.execCommand('styleWithCSS', false, true);
                    document.execCommand('formatBlock', false, `<${tag}>`);
                    this._onContentChange();
                }),
                fontFamily: this._createDropdown(this._el.fontFamilyDropdown, (family) => {
                    if (!family) return;
                    this._el.editor.focus();
                    this._restoreSelection();
                    this._applyFontFamily(family);
                }),
                fontSize: this._createDropdown(this._el.fontSizeDropdown, (px) => {
                    if (!px) return;
                    this._el.editor.focus();
                    this._restoreSelection();
                    this._applyFontSize(px);
                }),
                imageSize: this._createDropdown(this._el.imageSizeDropdown, (size) => {
                    if (!this._selectedImage) return;
                    if (size) {
                        this._selectedImage.style.width = `${size}%`;
                        this._selectedImage.style.height = 'auto';
                    } else {
                        this._selectedImage.style.removeProperty('width');
                        this._selectedImage.style.removeProperty('height');
                    }
                    this._positionImageBar();
                    this._onContentChange();
                })
            };
        }

        _bindDoc(type, fn, opts) {
            document.addEventListener(type, fn, opts);
            this._docListeners.push({ target: document, type, fn, opts });
        }

        _bindWin(type, fn, opts) {
            window.addEventListener(type, fn, opts);
            this._winListeners.push({ target: window, type, fn, opts });
        }

        _bindEvents() {
            const el = this._el;

            this.$$('.popover', this.root).forEach((popover) => {
                popover.addEventListener('mousedown', (event) => {
                    event.preventDefault();
                });
            });

            el.toolbar.addEventListener('mousedown', (event) => {
                if (event.target.closest('button')) event.preventDefault();
            });

            [this._dropdowns.block, this._dropdowns.fontFamily, this._dropdowns.fontSize].forEach((dropdown, index) => {
                const roots = [el.blockDropdown, el.fontFamilyDropdown, el.fontSizeDropdown];
                roots[index].querySelector('.dropdown__trigger').addEventListener('mousedown', () => this._saveSelection());
            });

            el.toolbar.addEventListener('click', (event) => {
                const button = event.target.closest('[data-cmd]');
                if (!button) return;
                const command = button.dataset.cmd;
                el.editor.focus();
                this._restoreSelection();
                document.execCommand('styleWithCSS', false, true);
                document.execCommand(command, false, button.dataset.value || null);
                this._onContentChange();
            });

            el.textColorBtn.addEventListener('click', (event) => {
                event.stopPropagation();
                const isOpen = !el.textColorPop.hidden;
                this._closePopovers();
                if (!isOpen) {
                    this._saveSelection();
                    el.textColorPop.hidden = false;
                    el.textColorBtn.setAttribute('aria-expanded', 'true');
                    this._positionPopover(el.textColorPop, el.textColorBtn);
                }
            });

            el.highlightBtn.addEventListener('click', (event) => {
                event.stopPropagation();
                const isOpen = !el.highlightPop.hidden;
                this._closePopovers();
                if (!isOpen) {
                    this._saveSelection();
                    el.highlightPop.hidden = false;
                    el.highlightBtn.setAttribute('aria-expanded', 'true');
                    this._positionPopover(el.highlightPop, el.highlightBtn);
                }
            });

            el.clearHighlight.addEventListener('click', () => {
                this._applyColor('hiliteColor', 'transparent');
                el.highlightSwatch.style.background = '#e9edd7';
            });

            this._bindDoc('click', (event) => {
                if (!event.target.closest('.tool-wrap')) this._closePopovers();
                if (!event.target.closest('.dropdown')) this._closeDropdowns();
            });

            this._bindDoc('mousedown', (event) => {
                if (!this._selectedImage) return;
                if (event.target.closest('[data-wysing="image-bar"]') || event.target.closest('[data-wysing="editor"]')) return;
                this._clearImageSelection();
            });

            const handleViewportChange = () => {
                this._closePopovers();
                this._closeDropdowns();
                if (this._selectedImage) this._positionImageBar();
            };

            this._bindWin('resize', handleViewportChange);
            el.toolbar.addEventListener('scroll', handleViewportChange, { passive: true });
            el.workspace.addEventListener('scroll', handleViewportChange, { passive: true });

            el.linkBtn.addEventListener('click', () => {
                this._saveSelection();
                const selection = window.getSelection();
                el.linkText.value = selection && !selection.isCollapsed ? selection.toString().trim() : '';
                el.linkUrl.value = '';
                this._openModal(el.linkModal);
                el.linkUrl.focus();
            });

            el.imageBtn.addEventListener('click', () => this._openImageModal());

            el.linkSave.addEventListener('click', () => this._applyLink());
            el.imageSave.addEventListener('click', () => this._applyImageUrl());

            el.linkText.addEventListener('keydown', (event) => {
                if (event.key === 'Enter') {
                    event.preventDefault();
                    el.linkUrl.focus();
                }
            });

            el.linkUrl.addEventListener('keydown', (event) => {
                if (event.key === 'Enter') {
                    event.preventDefault();
                    this._applyLink();
                }
            });

            el.imageUrl.addEventListener('keydown', (event) => {
                if (event.key === 'Enter') {
                    event.preventDefault();
                    this._applyImageUrl();
                }
            });

            el.pickImageBtn.addEventListener('click', () => {
                el.imageInput.value = '';
                el.imageInput.click();
            });

            el.imageInput.addEventListener('change', () => {
                const file = el.imageInput.files && el.imageInput.files[0];
                if (!file) return;
                this._insertImageFile(file, () => {
                    this._closeModal(el.imageModal);
                    this._toast('Imagen insertada');
                });
            });

            el.imageBar.addEventListener('mousedown', (event) => {
                if (event.target.closest('button')) event.preventDefault();
            });

            el.imageBar.addEventListener('click', (event) => {
                const alignButton = event.target.closest('[data-img-align]');
                if (alignButton && this._selectedImage) this._applyImageAlignment(this._selectedImage, alignButton.dataset.imgAlign);
            });

            el.imageDeleteBtn.addEventListener('click', () => this._deleteSelectedImage());

            el.imageReplaceBtn.addEventListener('click', () => {
                if (!this._selectedImage) return;
                el.imageReplaceInput.value = '';
                el.imageReplaceInput.click();
            });

            el.imageReplaceInput.addEventListener('change', () => {
                const file = el.imageReplaceInput.files && el.imageReplaceInput.files[0];
                if (!file || !this._selectedImage) return;
                const image = this._selectedImage;
                const reader = new FileReader();
                reader.addEventListener('load', () => {
                    image.src = String(reader.result || '');
                    image.alt = file.name || '';
                    image.addEventListener('load', () => this._positionImageBar(), { once: true });
                    this._positionImageBar();
                    this._onContentChange();
                    this._toast('Imagen reemplazada');
                });
                reader.readAsDataURL(file);
            });

            this.$$('[data-wysing-close]', this.root).forEach((button) => {
                button.addEventListener('click', () => {
                    const which = button.dataset.wysingClose;
                    const modal = which === 'link' ? el.linkModal : which === 'image' ? el.imageModal : null;
                    if (modal) this._closeModal(modal);
                });
            });

            el.linkClose.addEventListener('click', () => this._closeModal(el.linkModal));
            el.imageClose.addEventListener('click', () => this._closeModal(el.imageModal));

            this.$$('.modal-layer', this.root).forEach((layer) => {
                layer.addEventListener('mousedown', (event) => {
                    if (event.target === layer) this._closeModal(layer);
                });
            });

            el.editor.addEventListener('input', () => this._onContentChange());
            el.editor.addEventListener('keyup', () => this._refreshToolbar());
            el.editor.addEventListener('mouseup', () => {
                this._saveSelection();
                this._refreshToolbar();
            });
            el.editor.addEventListener('focus', () => this._refreshToolbar());

            el.editor.addEventListener('click', (event) => {
                if (this.root.classList.contains('is-preview')) return;
                const link = event.target.closest('a');
                if (link && el.editor.contains(link) && link.getAttribute('href')) {
                    event.preventDefault();
                    this._clearImageSelection();
                    window.open(link.href, '_blank', 'noopener,noreferrer');
                    return;
                }
                const image = event.target.closest('img');
                if (image && el.editor.contains(image)) {
                    this._selectImage(image);
                } else if (this._selectedImage) {
                    this._clearImageSelection();
                }
            });

            el.editor.addEventListener('keydown', (event) => {
                if (this._selectedImage && (event.key === 'Delete' || event.key === 'Backspace')) {
                    event.preventDefault();
                    this._deleteSelectedImage();
                    return;
                }
                if (event.key === 'Tab') {
                    event.preventDefault();
                    document.execCommand('insertHTML', false, '&nbsp;&nbsp;&nbsp;&nbsp;');
                    this._onContentChange();
                }
            });

            el.editor.addEventListener('paste', (event) => {
                const items = event.clipboardData ? Array.from(event.clipboardData.items) : [];
                const imageItem = items.find((item) => item.type && item.type.startsWith('image/'));
                if (!imageItem) return;
                const file = imageItem.getAsFile();
                if (!file) return;
                event.preventDefault();
                this._saveSelection();
                this._insertImageFile(file);
            });

            ['dragenter', 'dragover'].forEach((type) => {
                el.editor.addEventListener(type, (event) => {
                    if (event.dataTransfer && Array.from(event.dataTransfer.types || []).includes('Files')) {
                        event.preventDefault();
                    }
                });
            });

            el.editor.addEventListener('drop', (event) => {
                const files = Array.from(event.dataTransfer.files || []).filter((file) => file.type && file.type.startsWith('image/'));
                if (!files.length) return;
                event.preventDefault();
                this._saveSelection();
                files.forEach((file) => this._insertImageFile(file));
            });

            this._bindDoc('selectionchange', () => {
                const selection = window.getSelection();
                if (!selection || !selection.rangeCount) return;
                if (el.editor.contains(selection.anchorNode)) {
                    this._savedRange = selection.getRangeAt(0).cloneRange();
                    this._refreshToolbar();
                }
            });

            el.title.addEventListener('input', () => this._scheduleChange());
            el.title.addEventListener('keydown', (event) => {
                if (event.key === 'Enter') {
                    event.preventDefault();
                    el.editor.focus();
                }
            });

            el.previewBtn.addEventListener('click', () => {
                this._setPreview(!this.root.classList.contains('is-preview'));
            });

            el.newBtn.addEventListener('click', () => {
                if (window.confirm('¿Crear un documento nuevo? Se reemplazará el contenido actual.')) {
                    this._resetDocument('Documento sin título');
                    this._toast('Documento nuevo');
                }
            });

            el.clearBtn.addEventListener('click', () => {
                if (window.confirm('¿Vaciar el documento? Esta acción no se puede deshacer.')) {
                    this._resetDocument('Documento sin título');
                    this._toast('Documento vaciado');
                }
            });

            el.copyBtn.addEventListener('click', () => this._copyHtml());
            el.downloadBtn.addEventListener('click', () => this._downloadHtml());
            el.printBtn.addEventListener('click', () => window.print());

            this._bindDoc('keydown', (event) => {
                if (!this.root.contains(event.target) && !event.target.closest('.modal-layer')) {
                    const anyOpen = this.$$('.modal-layer').some((m) => !m.hidden)
                        || this.$$('.popover').some((p) => !p.hidden)
                        || this.$$('.dropdown.is-open').length > 0;
                    if (!anyOpen) return;
                }
                const modifier = event.ctrlKey || event.metaKey;
                if (modifier && event.key.toLowerCase() === 's') {
                    event.preventDefault();
                    if (this._saveNow()) this._toast('Documento guardado');
                }
                if (event.key === 'Escape') {
                    this._closePopovers();
                    this._closeDropdowns();
                    this._closeModals();
                    this._clearImageSelection();
                }
            });

            this._bindWin('beforeunload', () => {
                window.clearTimeout(this._changeTimer);
                if (!this._options.persistence) return;
                try {
                    localStorage.setItem(this._key('title'), el.title.value);
                    localStorage.setItem(this._key('content'), el.editor.innerHTML);
                    localStorage.setItem(this._key('savedAt'), new Date().toISOString());
                } catch (error) {
                }
            });
        }
    }

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = Wysing;
    } else if (typeof define === 'function' && define.amd) {
        define(function () { return Wysing; });
    } else {
        global.Wysing = Wysing;
    }
})(typeof window !== 'undefined' ? window : this);
