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

    const EXPORT_STYLES = `
.wysing-export {
    box-sizing: border-box;
    max-width: 820px;
    margin: 48px auto;
    padding: 60px 72px;
    background: #fffefa;
    color: #35383d;
    border: 1px solid #e6e2da;
    border-radius: 14px;
    font-family: "Iowan Old Style", "Palatino Linotype", Georgia, serif;
    font-size: 17.5px;
    line-height: 1.72;
    overflow-wrap: anywhere;
}
.wysing-export * { box-sizing: border-box; }
.wysing-export h1, .wysing-export h2, .wysing-export h3, .wysing-export h4, .wysing-export h5, .wysing-export h6 {
    font-family: "Segoe UI", ui-sans-serif, system-ui, sans-serif;
    color: #282b2f;
    letter-spacing: -0.022em;
    line-height: 1.22;
}
.wysing-export h1 { font-size: 2em; margin: 0.2em 0 0.55em; }
.wysing-export h2 { font-size: 1.5em; margin: 1.5em 0 0.5em; }
.wysing-export h3 { font-size: 1.15em; margin: 1.35em 0 0.4em; }
.wysing-export h1, .wysing-export h2, .wysing-export h3, .wysing-export h4, .wysing-export h5, .wysing-export h6 { break-after: avoid; }
.wysing-export img, .wysing-export pre, .wysing-export blockquote, .wysing-export table { break-inside: avoid; }
.wysing-export p { margin: 0 0 1em; }
.wysing-export a { color: #5b6977; text-underline-offset: 2.5px; }
.wysing-export ul, .wysing-export ol { margin: 0 0 1em; padding-left: 1.5em; }
.wysing-export li::marker { color: #6f7d8c; }
.wysing-export blockquote { margin: 1.5em 0; padding: 0.9em 1.3em; background: #f7f5f0; border-left: 3px solid #cfd6cd; border-radius: 0 10px 10px 0; color: #4f545a; }
.wysing-export pre { padding: 14px 17px; background: #f4f2ec; border: 1px solid #e6e2da; border-radius: 10px; white-space: pre-wrap; overflow-x: auto; font-family: "Cascadia Code", Consolas, monospace; font-size: 13.5px; }
.wysing-export code { padding: 2px 5px; background: #f1efe9; border-radius: 5px; font-family: "Cascadia Code", Consolas, monospace; font-size: 0.87em; }
.wysing-export pre code { padding: 0; background: transparent; }
.wysing-export hr { margin: 2em 0; border: 0; border-top: 1px dashed #d9d4ca; }
.wysing-export img { display: block; max-width: 100%; height: auto; margin: 1.5em 0; border-radius: 10px; }
.wysing-export table { width: 100%; border-collapse: collapse; margin: 1em 0; }
.wysing-export th, .wysing-export td { padding: 6px 8px; border: 1px solid #ddd8cf; text-align: left; }
@media (max-width: 640px) {
    .wysing-export { margin: 0; padding: 32px 22px; border: 0; border-radius: 0; }
}
`;

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
            this._themePreference = 'dark';
            this._density = 'comoda';
            try {
                const savedDensity = localStorage.getItem('wysing-density');
                if (savedDensity) this._density = savedDensity;
            } catch (e) { }
            this._pageWidth = 'normal';
            this._editorFontSize = 16;
            this._autosave = true;
            this._confirmOnClear = true;
            this._animations = true;
            this._changeCallbacks = [];
            this._savedRange = null;
            this._selectedImage = null;
            this._pdfBusy = false;
            this._html2PdfPromise = null;
            this._changeTimer = 0;
            this._toastTimer = 0;
            this._destroyed = false;
            this._docListeners = [];
            this._winListeners = [];
            this._docs = [];
            this._currentDocId = null;
            this._editing = false;
            this._editingTimer = 0;
            this._confirmCallback = null;
            this._toolbarUnits = [];
            this._toolbarGroups = [];

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
            try {
                const savedTheme = localStorage.getItem('wysing-theme');
                if (savedTheme) this._options.theme = savedTheme;
            } catch (e) { }
            this._applyTheme(this._options.theme);
            this._applyPageWidth(this._pageWidth);
            this._applyEditorFontSize(this._editorFontSize);
            this._applyAnimations(this._animations);

            this._loadDocs();
            if (!this._docs.length) {
                const doc = this._createDoc(this._options.title, this._options.content);
                this._docs.push(doc);
                this._currentDocId = doc.id;
                if (this._options.persistence) this._persistDocs();
            } else if (this._currentDocId === null) {
                this._currentDocId = this._docs[0].id;
            }
            const current = this._getCurrentDoc();
            let title = current ? current.title : this._options.title;
            let content = current ? current.content : this._options.content;
            let savedAt = current ? current.savedAt : null;

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
            this._initToolbarOverflow();
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
            if (this._toolbarResizeObserver) {
                this._toolbarResizeObserver.disconnect();
                this._toolbarResizeObserver = null;
            }
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

        _docsKey() {
            return `${this._options.storageKey}:docs`;
        }

        _currentKey() {
            return `${this._options.storageKey}:current`;
        }

        _createDoc(title, content) {
            return {
                id: `doc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                title: title == null ? '' : String(title),
                content: content == null ? '' : String(content),
                savedAt: null
            };
        }

        _getCurrentDoc() {
            return this._docs.find((doc) => doc.id === this._currentDocId) || null;
        }

        _loadDocs() {
            this._docs = [];
            this._currentDocId = null;
            if (!this._options.persistence) return;
            try {
                const raw = localStorage.getItem(this._docsKey());
                if (raw) {
                    const parsed = JSON.parse(raw);
                    if (Array.isArray(parsed)) this._docs = parsed;
                }
                const current = localStorage.getItem(this._currentKey());
                if (current) this._currentDocId = current;
            } catch (error) {
            }
            // migrate legacy single document
            if (!this._docs.length) {
                try {
                    const t = localStorage.getItem(this._key('title'));
                    const c = localStorage.getItem(this._key('content'));
                    const d = localStorage.getItem(this._key('savedAt'));
                    if (t !== null || c !== null) {
                        const doc = this._createDoc(t == null ? this._options.title : t, c == null ? this._options.content : c);
                        doc.savedAt = d;
                        this._docs.push(doc);
                        this._currentDocId = doc.id;
                    }
                } catch (error) {
                }
            }
        }

        _persistDocs() {
            if (!this._options.persistence) return;
            try {
                localStorage.setItem(this._docsKey(), JSON.stringify(this._docs));
                if (this._currentDocId) localStorage.setItem(this._currentKey(), this._currentDocId);
            } catch (error) {
            }
        }

        _saveCurrentDoc() {
            const doc = this._getCurrentDoc();
            if (!doc) return;
            doc.title = this._el.title.value;
            doc.content = this._el.editor.innerHTML;
            doc.savedAt = new Date().toISOString();
        }

        _openDocument(id) {
            if (id === this._currentDocId) return;
            this._saveCurrentDoc();
            this._currentDocId = id;
            const doc = this._getCurrentDoc();
            if (doc) {
                this._setTitleInternal(doc.title);
                this._setContentInternal(doc.content);
                if (doc.savedAt) {
                    const date = new Date(doc.savedAt);
                    if (!Number.isNaN(date.getTime())) this._el.savedAt.textContent = formatTime(date);
                } else {
                    this._el.saveLabel.textContent = 'Listo';
                }
            }
            this._persistDocs();
            this._updateStats();
            this._refreshToolbar();
            this._updateCodeOutput();
            this._renderDocsList();
        }

        _newDocument() {
            this._saveCurrentDoc();
            const doc = this._createDoc('Documento sin título', '');
            this._docs.push(doc);
            this._currentDocId = doc.id;
            this._setTitleInternal(doc.title);
            this._setContentInternal(doc.content);
            this._el.saveLabel.textContent = 'Listo';
            this._persistDocs();
            this._updateStats();
            this._refreshToolbar();
            this._updateCodeOutput();
            this._renderDocsList();
        }

        _deleteDocument(id) {
            if (this._docs.length <= 1) {
                this._toast('No se puede eliminar el último documento');
                return;
            }
            const index = this._docs.findIndex((doc) => doc.id === id);
            if (index === -1) return;
            const wasCurrent = id === this._currentDocId;
            this._docs.splice(index, 1);
            if (wasCurrent) {
                this._currentDocId = this._docs[Math.max(0, index - 1)].id;
                const doc = this._getCurrentDoc();
                this._setTitleInternal(doc.title);
                this._setContentInternal(doc.content);
                if (doc.savedAt) {
                    const date = new Date(doc.savedAt);
                    if (!Number.isNaN(date.getTime())) this._el.savedAt.textContent = formatTime(date);
                } else {
                    this._el.saveLabel.textContent = 'Listo';
                }
            }
            this._persistDocs();
            this._updateStats();
            this._refreshToolbar();
            this._updateCodeOutput();
            this._renderDocsList();
        }

        _renderDocsList() {
            const container = this._el.docsList;
            if (!container) return;
            container.innerHTML = '';
            this._docs.forEach((doc) => {
                const item = document.createElement('div');
                item.className = 'docs-list__item' + (doc.id === this._currentDocId ? ' is-active' : '');
                const title = document.createElement('button');
                title.type = 'button';
                title.className = 'docs-list__title';
                title.textContent = doc.title || 'Documento sin título';
                title.addEventListener('click', () => this._openDocument(doc.id));

                let indicator = null;
                if (doc.id === this._currentDocId) {
                    indicator = document.createElement('span');
                    indicator.className = 'miller-icon docs-list__indicator';
                    indicator.setAttribute('data-icon', 'file_text');
                    indicator.setAttribute('data-animated', 'true');
                    indicator.setAttribute('aria-hidden', 'true');
                    indicator.classList.toggle('is-visible', this._editing);
                }
                const del = document.createElement('button');
                del.type = 'button';
                del.className = 'docs-list__delete';
                del.setAttribute('aria-label', 'Eliminar documento');
                del.innerHTML = '<span class="miller-icon" data-icon="delete" aria-hidden="true"></span>';
                del.addEventListener('click', (event) => {
                    event.stopPropagation();
                    this._confirm('¿Eliminar este documento?', () => this._deleteDocument(doc.id));
                });
                item.appendChild(title);
                if (indicator) item.appendChild(indicator);
                item.appendChild(del);
                container.appendChild(item);
            });
        }

        _syncActiveDocTitle() {
            const doc = this._getCurrentDoc();
            if (!doc) return;
            doc.title = this._el.title.value;
            const item = this._el.docsList
                ? this._el.docsList.querySelector('.docs-list__item.is-active .docs-list__title')
                : null;
            if (!item) return;
            const label = doc.title || 'Documento sin título';
            if (item.textContent !== label) item.textContent = label;
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
            <button class="btn btn--icon" data-wysing="settings-btn" type="button" title="Configuración" aria-label="Configuración" aria-haspopup="dialog">
                <span class="miller-icon" data-icon="settings" aria-hidden="true"></span>
            </button>
            <button class="btn btn--ghost" data-wysing="preview-btn" type="button" aria-pressed="false" title="Vista previa de lectura">
                <span class="miller-icon" data-icon="eye" aria-hidden="true"></span>
                <span class="btn__label">Vista previa</span>
            </button>
            <button class="btn btn--ghost" data-wysing="copy-btn" type="button" title="Copiar HTML al portapapeles">
                <span class="miller-icon" data-icon="clipboard" aria-hidden="true"></span>
                <span class="btn__label">Copiar HTML</span>
            </button>
            <div class="dropdown dropdown--download" data-wysing="download-dropdown">
                <button class="btn btn--primary dropdown__trigger" data-wysing="download-btn" type="button" title="Descargar documento" aria-haspopup="menu" aria-expanded="false">
                    <span class="miller-icon" data-icon="download" aria-hidden="true"></span>
                    <span class="btn__label">Descargar</span>
                </button>
                <div class="dropdown__menu download-menu" data-wysing="download-menu" role="menu" hidden>
                    <button class="dropdown__item download-menu__item" type="button" role="menuitem" data-download="word">
                        <span class="miller-icon" data-icon="file_word" aria-hidden="true"></span>
                        <span>Word</span>
                        <span class="miller-icon download-menu__loader" data-icon="loader_min" data-animated="true" aria-hidden="true"></span>
                    </button>
                    <button class="dropdown__item download-menu__item" type="button" role="menuitem" data-download="pdf">
                        <span class="miller-icon" data-icon="file_pdf" aria-hidden="true"></span>
                        <span>PDF</span>
                        <span class="miller-icon download-menu__loader" data-icon="loader_min" data-animated="true" aria-hidden="true"></span>
                    </button>
                    <button class="dropdown__item download-menu__item" type="button" role="menuitem" data-download="html">
                        <span class="miller-icon" data-icon="code" aria-hidden="true"></span>
                        <span>HTML</span>
                        <span class="miller-icon download-menu__loader" data-icon="loader_min" data-animated="true" aria-hidden="true"></span>
                    </button>
                </div>
            </div>
        </div>
    </header>

    <div class="toolbar" data-wysing="toolbar" role="toolbar" aria-label="Herramientas de formato">
        <div class="toolbar__left" data-wysing="toolbar-left">
        <div class="toolbar__group">
            <button class="tool" type="button" data-cmd="undo" title="Deshacer (Ctrl+Z)" aria-label="Deshacer">
                <span class="miller-icon" data-icon="undo" aria-hidden="true"></span>
            </button>
            <button class="tool" type="button" data-cmd="redo" title="Rehacer (Ctrl+Y)" aria-label="Rehacer">
                <span class="miller-icon" data-icon="redo" aria-hidden="true"></span>
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
                <span class="miller-icon" data-icon="list_item" aria-hidden="true"></span>
            </button>
            <button class="tool" type="button" data-cmd="insertOrderedList" title="Lista numerada" aria-label="Lista numerada">
                <span class="miller-icon" data-icon="list_order" aria-hidden="true"></span>
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

        </div>
        <div class="toolbar__right" data-wysing="toolbar-right">
            <div class="toolbar__more" data-wysing="toolbar-more" hidden>
                <button class="tool" data-wysing="toolbar-more-btn" type="button" title="Más" aria-label="Más" aria-expanded="false" aria-haspopup="true">
                    <span class="miller-icon" data-icon="more" aria-hidden="true"></span>
                </button>
                <div class="toolbar__more-menu" data-wysing="toolbar-more-menu" hidden></div>
            </div>

            <div class="toolbar__group">
                <button class="tool" data-wysing="docs-btn" type="button" title="Historial" aria-label="Historial">
                <span class="miller-icon" data-icon="history" aria-hidden="true"></span>
            </button>
            <button class="tool" data-wysing="print-btn" type="button" title="Imprimir" aria-label="Imprimir">
                <span class="miller-icon" data-icon="printer" aria-hidden="true"></span>
            </button>
            <button class="tool" data-wysing="code-btn" type="button" title="Ver código HTML" aria-label="Ver código HTML" aria-pressed="false">
                <span class="miller-icon" data-icon="code" aria-hidden="true"></span>
            </button>
            <button class="tool tool--danger" data-wysing="clear-btn" type="button" title="Vaciar documento" aria-label="Vaciar documento">
                <span class="miller-icon" data-icon="delete" aria-hidden="true"></span>
            </button>
        </div>
        </div>
    </div>

    <main class="workspace" data-wysing="workspace">
        <div class="paper" data-wysing="paper">
            <article class="editor" data-wysing="editor" contenteditable="true" spellcheck="${spellcheck}" data-placeholder="${placeholder}" aria-label="Área de edición"></article>
        </div>
        <aside class="docs-panel" data-wysing="docs-panel" hidden>
            <header class="docs-panel__head">
                <span class="miller-icon" data-icon="history" aria-hidden="true"></span>
                <span>Historial</span>
                <button class="tool" type="button" data-wysing="docs-panel-close" aria-label="Cerrar">
                    <span class="miller-icon" data-icon="close" aria-hidden="true"></span>
                </button>
            </header>
            <div class="docs-list" data-wysing="docs-list"></div>
            <footer class="docs-panel__foot">
                <button class="btn btn--primary btn--wide" type="button" data-wysing="docs-new">Nuevo documento</button>
            </footer>
        </aside>
        <aside class="code-panel" data-wysing="code-panel" hidden>
            <header class="code-panel__head">
                <span class="miller-icon" data-icon="code" aria-hidden="true"></span>
                <span>Código HTML</span>
            </header>
            <pre class="code-panel__body"><code data-wysing="code-output"></code></pre>
        </aside>
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

    <div class="modal-layer" data-wysing="confirm-modal" hidden>
        <div class="modal" role="dialog" aria-modal="true" aria-labelledby="${uid}-confirm-title">
            <header class="modal__head">
                <div class="modal__heading">
                    <span class="modal__icon"><span class="miller-icon" data-icon="error_warning" aria-hidden="true"></span></span>
                    <div>
                        <h2 id="${uid}-confirm-title">Confirmar</h2>
                        <p>Esta acción no se puede deshacer.</p>
                    </div>
                </div>
                <button class="tool" type="button" data-wysing="confirm-close" aria-label="Cerrar">
                    <span class="miller-icon" data-icon="close" aria-hidden="true"></span>
                </button>
            </header>
            <p class="confirm__message" data-wysing="confirm-message"></p>
            <footer class="modal__foot">
                <button class="btn btn--ghost" type="button" data-wysing="confirm-cancel">Cancelar</button>
                <button class="btn btn--primary" type="button" data-wysing="confirm-ok">Confirmar</button>
            </footer>
        </div>
    </div>

    <div class="modal-layer modal-layer--settings" data-wysing="settings-modal" hidden>
        <div class="modal modal--settings" role="dialog" aria-modal="true" aria-labelledby="${uid}-settings-title">
            <header class="modal__head">
                <div class="modal__heading">
                    <span class="modal__icon"><span class="miller-icon" data-icon="settings" aria-hidden="true"></span></span>
                    <div>
                        <h2 id="${uid}-settings-title">Configuración</h2>
                        <p>Personaliza la apariencia y el comportamiento del panel.</p>
                    </div>
                </div>
                <button class="tool" type="button" data-wysing="settings-close" aria-label="Cerrar">
                    <span class="miller-icon" data-icon="close" aria-hidden="true"></span>
                </button>
            </header>
            <div class="settings">
                <section class="settings__section" aria-labelledby="${uid}-settings-appearance">
                    <h3 class="settings__title" id="${uid}-settings-appearance">Apariencia</h3>
                    <div class="settings__row">
                        <div class="settings__copy">
                            <strong>Tema del panel</strong>
                            <span>Color de la interfaz y del área de trabajo.</span>
                        </div>
                        <div class="settings__segmented" role="group" aria-label="Tema del panel" data-wysing="settings-theme">
                            <button class="settings__segment is-active" type="button" data-theme="dark" aria-pressed="true">Oscuro</button>
                            <button class="settings__segment" type="button" data-theme="light" aria-pressed="false">Claro</button>
                            <button class="settings__segment" type="button" data-theme="system" aria-pressed="false">Sistema</button>
                        </div>
                    </div>
                    <div class="settings__row">
                        <div class="settings__copy">
                            <strong>Densidad</strong>
                            <span>Espacio entre los elementos del panel.</span>
                        </div>
                        <div class="dropdown dropdown--settings" data-wysing="settings-density" aria-label="Densidad del panel">
                            <button class="dropdown__trigger" type="button" aria-haspopup="listbox" aria-expanded="false">
                                <span class="dropdown__label">Cómoda</span>
                                <span class="miller-icon dropdown__caret" data-icon="arrow_down" aria-hidden="true"></span>
                            </button>
                            <div class="dropdown__menu" role="listbox" hidden>
                                <button class="dropdown__item" type="button" role="option" data-value="compacta">Compacta</button>
                                <button class="dropdown__item is-active" type="button" role="option" data-value="comoda">Cómoda</button>
                                <button class="dropdown__item" type="button" role="option" data-value="amplia">Amplia</button>
                            </div>
                        </div>
                    </div>
                </section>
                <section class="settings__section" aria-labelledby="${uid}-settings-editor">
                    <h3 class="settings__title" id="${uid}-settings-editor">Editor</h3>
                    <div class="settings__row">
                        <div class="settings__copy">
                            <strong>Tamaño de fuente</strong>
                            <span>Tamaño base del texto del documento.</span>
                        </div>
                        <div class="settings__range-wrap">
                            <input class="settings__range" data-wysing="settings-range" type="range" min="12" max="24" step="1" value="16" aria-label="Tamaño de fuente">
                            <output class="settings__range-value" data-wysing="settings-range-value">16 px</output>
                        </div>
                    </div>
                    <div class="settings__row">
                        <div class="settings__copy">
                            <strong>Ancho de página</strong>
                            <span>Define el espacio disponible para escribir.</span>
                        </div>
                        <div class="settings__segmented" role="group" aria-label="Ancho de página" data-wysing="settings-width">
                            <button class="settings__segment is-active" type="button" data-width="normal" aria-pressed="true">Normal</button>
                            <button class="settings__segment" type="button" data-width="wide" aria-pressed="false">Amplio</button>
                        </div>
                    </div>
                </section>
                <section class="settings__section" aria-labelledby="${uid}-settings-behavior">
                    <h3 class="settings__title" id="${uid}-settings-behavior">Comportamiento</h3>
                    <div class="settings__row">
                        <div class="settings__copy">
                            <strong>Autoguardado</strong>
                            <span>Guarda los cambios mientras escribes.</span>
                        </div>
                        <label class="settings-switch">
                            <input type="checkbox" checked data-wysing="settings-autosave" aria-label="Autoguardado">
                            <span class="settings-switch__track"></span>
                        </label>
                    </div>
                    <div class="settings__row">
                        <div class="settings__copy">
                            <strong>Confirmar al vaciar</strong>
                            <span>Pide confirmación antes de borrar el documento.</span>
                        </div>
                        <label class="settings-switch">
                            <input type="checkbox" checked data-wysing="settings-confirm" aria-label="Confirmar al vaciar">
                            <span class="settings-switch__track"></span>
                        </label>
                    </div>
                    <div class="settings__row">
                        <div class="settings__copy">
                            <strong>Animaciones</strong>
                            <span>Muestra transiciones suaves en el panel.</span>
                        </div>
                        <label class="settings-switch">
                            <input type="checkbox" checked data-wysing="settings-animations" aria-label="Animaciones">
                            <span class="settings-switch__track"></span>
                        </label>
                    </div>
                </section>
            </div>
            <footer class="modal__foot settings__foot">
                <button class="btn btn--ghost" type="button" data-wysing="settings-reset">Restablecer</button>
                <button class="btn btn--primary" type="button" data-wysing="settings-done">Listo</button>
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
                toolbarLeft: $('[data-wysing="toolbar-left"]'),
                toolbarRight: $('[data-wysing="toolbar-right"]'),
                toolbarMore: $('[data-wysing="toolbar-more"]'),
                toolbarMoreBtn: $('[data-wysing="toolbar-more-btn"]'),
                toolbarMoreMenu: $('[data-wysing="toolbar-more-menu"]'),
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
                docsBtn: $('[data-wysing="docs-btn"]'),
                confirmModal: $('[data-wysing="confirm-modal"]'),
                confirmMessage: $('[data-wysing="confirm-message"]'),
                confirmCancel: $('[data-wysing="confirm-cancel"]'),
                confirmOk: $('[data-wysing="confirm-ok"]'),
                confirmClose: $('[data-wysing="confirm-close"]'),
                docsPanel: $('[data-wysing="docs-panel"]'),
                docsPanelClose: $('[data-wysing="docs-panel-close"]'),
                docsList: $('[data-wysing="docs-list"]'),
                docsNewBtn: $('[data-wysing="docs-new"]'),
                copyBtn: $('[data-wysing="copy-btn"]'),
                downloadBtn: $('[data-wysing="download-btn"]'),
                downloadDropdown: $('[data-wysing="download-dropdown"]'),
                downloadMenu: $('[data-wysing="download-menu"]'),
                settingsBtn: $('[data-wysing="settings-btn"]'),
                settingsModal: $('[data-wysing="settings-modal"]'),
                settingsTheme: $('[data-wysing="settings-theme"]'),
                settingsClose: $('[data-wysing="settings-close"]'),
                settingsDone: $('[data-wysing="settings-done"]'),
                settingsReset: $('[data-wysing="settings-reset"]'),
                settingsDensity: $('[data-wysing="settings-density"]'),
                settingsWidth: $('[data-wysing="settings-width"]'),
                settingsRange: $('[data-wysing="settings-range"]'),
                settingsRangeValue: $('[data-wysing="settings-range-value"]'),
                settingsAutosave: $('[data-wysing="settings-autosave"]'),
                settingsConfirm: $('[data-wysing="settings-confirm"]'),
                settingsAnimations: $('[data-wysing="settings-animations"]'),
                printBtn: $('[data-wysing="print-btn"]'),
                codeBtn: $('[data-wysing="code-btn"]'),
                codePanel: $('[data-wysing="code-panel"]'),
                codeOutput: $('[data-wysing="code-output"]'),
                clearBtn: $('[data-wysing="clear-btn"]'),
                toast: $('[data-wysing="toast"]'),
                blockDropdown: $('[data-wysing="block-dropdown"]'),
                fontFamilyDropdown: $('[data-wysing="font-family-dropdown"]'),
                fontSizeDropdown: $('[data-wysing="font-size-dropdown"]'),
                imageSizeDropdown: $('[data-wysing="image-size-dropdown"]')
            };
        }

        _applyTheme(theme) {
            const pref = theme === 'light' || theme === 'dark' || theme === 'system' ? theme : (theme === 'system' ? 'system' : 'dark');
            this._themePreference = pref;
            let resolved = pref;
            if (pref === 'system') {
                try { resolved = window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'; } catch (e) { resolved = 'dark'; }
            }
            this._theme = resolved;
            this.root.classList.remove('wysing--dark', 'wysing--light');
            this.root.classList.add(`wysing--${resolved}`);
            this._syncThemeSegments();
            try { localStorage.setItem('wysing-theme', this._themePreference); } catch (e) { }
        }

        _syncThemeSegments() {
            const group = this._el.settingsTheme;
            if (!group) return;
            group.querySelectorAll('.settings__segment').forEach((btn) => {
                const active = btn.dataset.theme === this._themePreference;
                btn.classList.toggle('is-active', active);
                btn.setAttribute('aria-pressed', String(active));
            });
        }

        _applyDensity(value) {
            this._density = value || 'comoda';
            if (!this.root) return;
            this.root.classList.remove('wysing--density-compacta', 'wysing--density-comoda', 'wysing--density-amplia');
            this.root.classList.add(`wysing--density-${this._density}`);
            try { localStorage.setItem('wysing-density', this._density); } catch (e) { }
            const more = this._el.toolbarMore;
            const left = this._el.toolbarLeft;
            const right = this._el.toolbarRight;
            if (more && left && right && more.parentElement !== right) {
                right.insertBefore(more, right.firstChild);
            }
            window.setTimeout(() => this._updateToolbarOverflow(), 0);
        }

        _applyPageWidth(value) {
            this._pageWidth = value || 'normal';
            if (!this.root) return;
            this.root.classList.remove('wysing--width-normal', 'wysing--width-wide');
            this.root.classList.add(`wysing--width-${this._pageWidth}`);
            this._syncWidthSegments();
        }

        _syncWidthSegments() {
            const group = this._el.settingsWidth;
            if (!group) return;
            group.querySelectorAll('.settings__segment').forEach((btn) => {
                const active = btn.dataset.width === this._pageWidth;
                btn.classList.toggle('is-active', active);
                btn.setAttribute('aria-pressed', String(active));
            });
        }

        _applyEditorFontSize(value) {
            const px = Math.max(12, Math.min(24, Number(value) || 16));
            this._editorFontSize = px;
            if (this._el && this._el.editor) this._el.editor.style.fontSize = `${px}px`;
            if (this._el && this._el.settingsRangeValue) this._el.settingsRangeValue.textContent = `${px} px`;
        }

        _applyAnimations(enabled) {
            this._animations = Boolean(enabled);
            if (!this.root) return;
            this.root.classList.toggle('wysing--no-animations', !this._animations);
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
            this._updateCodeOutput();
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

        _updateCodeOutput() {
            if (!this._el.codeOutput) return;
            const normalized = this._el.editor.innerHTML
                .split('\n')
                .map((line) => line.trimStart())
                .join('\n')
                .replace(/\n{3,}/g, '\n\n');
            this._el.codeOutput.innerHTML = this._highlightHtml(normalized);
        }

        _highlightHtml(value) {
            const escaped = escapeHtml(value);
            return escaped.replace(/(&lt;!--[\s\S]*?--&gt;)|(&lt;\/?[A-Za-z][\w:-]*[\s\S]*?&gt;)/g, (tag) => {
                if (tag.startsWith('&lt;!--')) return `<span class="hl-comment">${tag}</span>`;
                let inner = tag;
                inner = inner.replace(/\s([A-Za-z_][\w:-]*)(\s*=\s*)/g, ' <span class="hl-attr">$1</span>$2');
                inner = inner.replace(/(&quot;[^&]*?&quot;)|(&#39;[^&]*?&#39;)/g, '<span class="hl-str">$&</span>');
                inner = inner.replace(/^(&lt;\/?)([A-Za-z][\w:-]*)/, '$1<span class="hl-tag">$2</span>');
                return inner;
            });
        }

        _setPanelState(panel, button, enabled, onOpen) {
            if (!panel) return;
            panel.hidden = !enabled;
            if (button) {
                button.classList.toggle('is-active', enabled);
                button.setAttribute('aria-pressed', String(enabled));
            }
            if (enabled && typeof onOpen === 'function') onOpen();
        }

        _setCodePanel(enabled) {
            this._setPanelState(this._el.codePanel, this._el.codeBtn, enabled, () => this._updateCodeOutput());
        }

        _setDocsPanel(enabled) {
            this._setPanelState(this._el.docsPanel, this._el.docsBtn, enabled, () => this._renderDocsList());
        }

        _initToolbarOverflow() {
            const toolbar = this._el.toolbar;
            const more = this._el.toolbarMore;
            const left = this._el.toolbarLeft || toolbar;
            const right = this._el.toolbarRight;
            if (!toolbar || !more || !left || !right) return;
            this._toolbarGroups = Array.from(left.children).filter((child) => child.classList.contains('toolbar__group'));
            this._toolbarUnits = [];
            Array.from(left.children).forEach((child) => {
                if (child.classList.contains('toolbar__group')) {
                    const fixed = child.querySelector('.dropdown, .toolbar__lead');
                    if (fixed) {
                        this._toolbarUnits.push({ el: child, parent: left, next: child.nextSibling });
                        return;
                    }
                    Array.from(child.children).forEach((unitEl) => {
                        this._toolbarUnits.push({ el: unitEl, parent: child, next: unitEl.nextSibling });
                    });
                    return;
                }
                this._toolbarUnits.push({ el: child, parent: left, next: child.nextSibling });
            });
            this._trailingGroup = right.querySelector('.toolbar__group');
            window.setTimeout(() => this._updateToolbarOverflow(), 0);
            window.setTimeout(() => this._updateToolbarOverflow(), 250);
            const onResize = () => this._updateToolbarOverflow();
            window.addEventListener('resize', onResize);
            this._winListeners.push({ target: window, type: 'resize', fn: onResize, opts: undefined });
            toolbar.addEventListener('scroll', onResize, { passive: true });
            if (typeof ResizeObserver !== 'undefined') {
                this._toolbarResizeObserver = new ResizeObserver(onResize);
                this._toolbarResizeObserver.observe(toolbar);
                this._toolbarResizeObserver.observe(left);
                this._toolbarResizeObserver.observe(right);
            }
        }

        _updateToolbarOverflow() {
            const toolbar = this._el.toolbar;
            const left = this._el.toolbarLeft || toolbar;
            const right = this._el.toolbarRight;
            const more = this._el.toolbarMore;
            const menu = this._el.toolbarMoreMenu;
            const trailingGroup = this._trailingGroup;
            if (!toolbar || !left || !right || !more || !menu) return;
            const menuWasOpen = !menu.hidden;

            if (!this._toolbarMenuGroup || !menu.contains(this._toolbarMenuGroup)) {
                this._toolbarMenuGroup = document.createElement('div');
                this._toolbarMenuGroup.className = 'toolbar__group';
                menu.appendChild(this._toolbarMenuGroup);
            }
            const menuGroup = this._toolbarMenuGroup;

            this._toolbarGroups.forEach((group) => {
                group.hidden = false;
            });
            for (let i = this._toolbarUnits.length - 1; i >= 0; i--) {
                const unit = this._toolbarUnits[i];
                const el = unit.el;
                if (el.parentNode === unit.parent && el.nextSibling === unit.next) continue;
                unit.parent.insertBefore(el, unit.next);
            }
            if (trailingGroup && trailingGroup.parentNode !== right) {
                right.insertBefore(trailingGroup, more);
            }
            while (menuGroup.firstChild) menuGroup.removeChild(menuGroup.firstChild);
            more.hidden = true;
            menu.hidden = true;
            if (this._el.toolbarMoreBtn) this._el.toolbarMoreBtn.setAttribute('aria-expanded', 'false');

            const isSep = (el) => Boolean(el && el.classList && el.classList.contains('toolbar__sep'));
            const visibleChildren = () => Array.from(left.children).filter((child) => !child.hidden);
            const leftFits = () => left.scrollWidth <= left.clientWidth + 1;
            const hideEmptyGroups = () => {
                this._toolbarGroups.forEach((group) => {
                    if (group.parentNode !== left) return;
                    const hasContent = group.querySelector('.tool:not([hidden]), .dropdown, .tool-wrap, .toolbar__lead');
                    group.hidden = !hasContent;
                });
            };
            const moveToMenu = (el) => {
                menuGroup.appendChild(el);
            };
            const cleanupEdges = () => {
                let visible = visibleChildren();
                while (isSep(visible[0])) {
                    moveToMenu(visible[0]);
                    visible = visibleChildren();
                }
                while (isSep(visible[visible.length - 1])) {
                    moveToMenu(visible[visible.length - 1]);
                    visible = visibleChildren();
                }
            };
            const reorderMenu = () => {
                this._toolbarUnits.forEach((unit) => {
                    if (unit.el.parentNode === menuGroup) menuGroup.appendChild(unit.el);
                });
            };

            if (leftFits()) return;

            more.hidden = false;

            for (let i = this._toolbarUnits.length - 1; i >= 0; i--) {
                if (leftFits()) break;
                const unit = this._toolbarUnits[i];
                if (unit.el.parentNode === menuGroup) continue;
                moveToMenu(unit.el);
                hideEmptyGroups();
                cleanupEdges();
            }
            cleanupEdges();
            reorderMenu();

            let restoreFrom = this._toolbarUnits.length;
            for (let i = 0; i < this._toolbarUnits.length; i++) {
                if (this._toolbarUnits[i].el.parentNode === menuGroup) {
                    restoreFrom = i;
                    break;
                }
            }
            for (let i = restoreFrom; i < this._toolbarUnits.length; i++) {
                const unit = this._toolbarUnits[i];
                if (unit.el.parentNode !== menuGroup) continue;
                if (unit.parent !== left) unit.parent.hidden = false;
                unit.parent.appendChild(unit.el);
                if (left.scrollWidth > left.clientWidth + 1) {
                    menuGroup.appendChild(unit.el);
                    hideEmptyGroups();
                    break;
                }
            }
            cleanupEdges();
            reorderMenu();

            if (!menuGroup.querySelector('.tool, .dropdown, .tool-wrap')) {
                more.hidden = true;
                menu.hidden = true;
                if (this._el.toolbarMoreBtn) this._el.toolbarMoreBtn.setAttribute('aria-expanded', 'false');
            } else if (menuWasOpen) {
                menu.hidden = false;
                this._positionToolbarMoreMenu();
                if (this._el.toolbarMoreBtn) this._el.toolbarMoreBtn.setAttribute('aria-expanded', 'true');
            }
        }

        _positionToolbarMoreMenu() {
            const btn = this._el.toolbarMoreBtn;
            const menu = this._el.toolbarMoreMenu;
            if (!btn || !menu) return;
            const rect = btn.getBoundingClientRect();
            menu.style.top = `${Math.round(rect.bottom + 6)}px`;
            menu.style.left = `${Math.round(Math.max(8, rect.right - (menu.offsetWidth || 160)))}px`;
        }

        _toggleDownloadMenu() {
            const trigger = this._el.downloadBtn;
            const menu = this._el.downloadMenu;
            const root = this._el.downloadDropdown;
            if (!trigger || !menu || !root) return;
            const open = menu.hidden;
            this._closeDropdowns(root);
            menu.hidden = !open;
            root.classList.toggle('is-open', open);
            trigger.setAttribute('aria-expanded', String(open));
            if (!open) return;
            const rect = trigger.getBoundingClientRect();
            const width = menu.offsetWidth || 184;
            const margin = 8;
            const left = Math.max(margin, Math.min(rect.right - width, window.innerWidth - width - margin));
            menu.style.left = `${Math.round(left)}px`;
            menu.style.top = `${Math.round(rect.bottom + 6)}px`;
        }

        _startDownload(item) {
            if (this._downloadPending) return;
            const format = item.dataset.download;
            const loader = item.querySelector('.download-menu__loader');
            this._downloadPending = true;
            item.classList.add('is-loading');
            item.setAttribute('aria-busy', 'true');
            if (loader) loader.classList.add('is-visible');
            window.setTimeout(() => {
                this._downloadPending = false;
                item.classList.remove('is-loading');
                item.removeAttribute('aria-busy');
                if (loader) loader.classList.remove('is-visible');
                this._closeDropdowns();
                if (format === 'word') this._downloadWord();
                else if (format === 'pdf') this._downloadPdf();
                else if (format === 'html') this._downloadHtml();
            }, 2000);
        }

        _confirm(message, onConfirm) {
            this._confirmCallback = typeof onConfirm === 'function' ? onConfirm : null;
            if (this._el.confirmMessage) this._el.confirmMessage.textContent = message;
            this._openModal(this._el.confirmModal);
        }

        _setEditing(value) {
            this._editing = Boolean(value);
            window.clearTimeout(this._editingTimer);
            if (this._editing) {
                this._editingTimer = window.setTimeout(() => {
                    this._editing = false;
                    this._updateDocsIndicator();
                }, 2000);
            }
            this._updateDocsIndicator();
        }

        _updateDocsIndicator() {
            const indicator = this._el.docsList ? this._el.docsList.querySelector('.docs-list__indicator') : null;
            if (indicator) indicator.classList.toggle('is-visible', this._editing);
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
            const now = new Date();
            if (this._options.persistence && this._autosave) {
                try {
                    this._saveCurrentDoc();
                    const currentDoc = this._getCurrentDoc();
                    if (currentDoc) currentDoc.savedAt = now.toISOString();
                    this._persistDocs();
                    this._el.savedAt.textContent = formatTime(now);
                    this._setSaveState(false);
                } catch (error) {
                    ok = false;
                    this._setSaveState(false);
                    this._toast('No se pudo guardar: el documento es demasiado grande.');
                }
            } else {
                this._saveCurrentDoc();
                this._el.savedAt.textContent = formatTime(now);
                this._setSaveState(false);
            }
            this._syncActiveDocTitle();
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
            if (this._el.codePanel && !this._el.codePanel.hidden) this._updateCodeOutput();
            this._setEditing(true);
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

        _openSettingsModal() {
            const modal = this._el.settingsModal;
            if (!modal) return;
            this._closeModals();
            window.clearTimeout(this._settingsCloseTimer);
            this._closePopovers();
            this._closeDropdowns();
            this._syncThemeSegments();
            this._syncWidthSegments();
            if (this._el.settingsRange) this._el.settingsRange.value = this._editorFontSize;
            if (this._el.settingsRangeValue) this._el.settingsRangeValue.textContent = `${this._editorFontSize} px`;
            if (this._el.settingsAutosave) this._el.settingsAutosave.checked = this._autosave;
            if (this._el.settingsConfirm) this._el.settingsConfirm.checked = this._confirmOnClear;
            if (this._el.settingsAnimations) this._el.settingsAnimations.checked = this._animations;
            modal.classList.remove('is-closing', 'is-open');
            modal.hidden = false;
            void modal.offsetWidth;
            modal.classList.add('is-open');
            if (this._el.settingsClose) this._el.settingsClose.focus();
        }

        _closeSettingsModal() {
            const modal = this._el.settingsModal;
            if (!modal || modal.hidden || modal.classList.contains('is-closing')) return;
            const restoreFocus = modal.contains(document.activeElement);
            window.clearTimeout(this._settingsCloseTimer);
            modal.classList.remove('is-open');
            modal.classList.add('is-closing');
            this._settingsCloseTimer = window.setTimeout(() => {
                modal.hidden = true;
                modal.classList.remove('is-closing');
                if (restoreFocus && this._el.settingsBtn) this._el.settingsBtn.focus();
            }, 200);
        }

        _closeModal(modal) {
            if (!modal) return;
            if (modal === this._el.settingsModal) {
                this._closeSettingsModal();
                return;
            }
            if (modal === this._el.confirmModal) this._confirmCallback = null;
            modal.hidden = true;
        }

        _closeModals() {
            this.$$('.modal-layer').forEach((modal) => this._closeModal(modal));
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

        _safePastedUrl(value, allowImage) {
            const raw = String(value || '').trim();
            if (!raw) return '';
            if (allowImage && /^data:image\/(?:png|jpe?g|gif|webp|avif);base64,/i.test(raw)) return raw;
            if (raw.startsWith('//')) return `https:${raw}`;
            if (/^(?:https?:\/\/|mailto:|tel:)/i.test(raw)) return raw;
            return '';
        }

        _cleanPastedHtml(html) {
            if (!html) return '';
            const doc = new DOMParser().parseFromString(String(html), 'text/html');
            const body = doc.body;
            if (!body) return '';

            const drop = new Set([
                'SCRIPT', 'STYLE', 'HEAD', 'META', 'LINK', 'TITLE', 'NOSCRIPT', 'TEMPLATE',
                'IFRAME', 'OBJECT', 'EMBED', 'FORM', 'INPUT', 'BUTTON', 'SELECT', 'TEXTAREA',
                'SVG', 'MATH', 'CANVAS', 'VIDEO', 'AUDIO', 'SOURCE', 'TRACK', 'MAP', 'AREA', 'BASE'
            ]);
            const unwrap = new Set(['SPAN', 'FONT', 'SMALL', 'LABEL', 'ABBR', 'TIME', 'BIG', 'TT', 'CENTER', 'DETAILS', 'SUMMARY']);
            const containers = new Set([
                'DIV', 'SECTION', 'ARTICLE', 'HEADER', 'FOOTER', 'MAIN', 'FIGURE', 'FIGCAPTION', 'ADDRESS'
            ]);
            const blocks = new Set([
                'P', 'DIV', 'SECTION', 'ARTICLE', 'HEADER', 'FOOTER', 'MAIN', 'FIGURE', 'FIGCAPTION',
                'ADDRESS', 'CENTER', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'BLOCKQUOTE', 'PRE',
                'UL', 'OL', 'LI', 'HR', 'TABLE', 'THEAD', 'TBODY', 'TFOOT', 'TR', 'TH', 'TD'
            ]);
            const inline = new Set([
                'A', 'STRONG', 'B', 'EM', 'I', 'U', 'S', 'STRIKE', 'DEL', 'SUB', 'SUP', 'CODE',
                'BR', 'IMG', 'MARK'
            ]);

            Array.from(body.querySelectorAll('*')).forEach((el) => {
                const style = el.getAttribute('style') || '';
                if (el.hasAttribute('hidden') || /(?:^|;)\s*(?:display\s*:\s*none|visibility\s*:\s*hidden)/i.test(style)) {
                    el.remove();
                }
            });

            const elements = Array.from(body.querySelectorAll('*'));
            for (let i = elements.length - 1; i >= 0; i--) {
                const el = elements[i];
                if (!el.parentNode) continue;
                const tag = el.tagName.toUpperCase();
                if (drop.has(tag)) {
                    el.remove();
                    continue;
                }

                const style = el.getAttribute('style') || '';
                const isBoldTag = ['B', 'STRONG'].includes(tag);
                const isItalicTag = ['I', 'EM'].includes(tag);
                const isUnderlineTag = tag === 'U';
                const isStrikeTag = ['S', 'STRIKE', 'DEL'].includes(tag);
                const forceUnwrap = (isBoldTag && /font-weight\s*:\s*(?:normal|lighter|[1-5]00)\b/i.test(style))
                    || (isItalicTag && /font-style\s*:\s*normal\b/i.test(style))
                    || ((isUnderlineTag || isStrikeTag) && /text-decoration(?:-line)?\s*:[^;]*\bnone\b/i.test(style));
                const wrappers = [];
                if (!isBoldTag && /font-weight\s*:\s*(?:bold|bolder|[6-9]00)/i.test(style)) wrappers.push('strong');
                if (!isItalicTag && /font-style\s*:\s*(?:italic|oblique)/i.test(style)) wrappers.push('em');
                if (!isUnderlineTag && /text-decoration(?:-line)?\s*:[^;]*underline/i.test(style)) wrappers.push('u');
                if (!isStrikeTag && /text-decoration(?:-line)?\s*:[^;]*line-through/i.test(style)) wrappers.push('s');

                let href = '';
                let src = '';
                let alt = '';
                if (tag === 'A') href = this._safePastedUrl(el.getAttribute('href'), false);
                if (tag === 'IMG') {
                    src = this._safePastedUrl(el.getAttribute('src'), true);
                    alt = el.getAttribute('alt') || '';
                }

                Array.from(el.attributes).forEach((attr) => el.removeAttribute(attr.name));

                if (tag === 'IMG') {
                    if (!src) {
                        el.remove();
                        continue;
                    }
                    el.setAttribute('src', src);
                    if (alt) el.setAttribute('alt', alt);
                    continue;
                }

                if (tag === 'A' && href) {
                    el.setAttribute('href', href);
                    el.setAttribute('target', '_blank');
                    el.setAttribute('rel', 'noopener noreferrer');
                }

                const hasBlockChild = Array.from(el.children).some((child) => blocks.has(child.tagName.toUpperCase()));
                if (wrappers.length && !hasBlockChild && !['BR', 'HR', 'PRE', 'CODE'].includes(tag)) {
                    let target = el;
                    wrappers.forEach((name) => {
                        const wrapper = doc.createElement(name);
                        while (target.firstChild) wrapper.appendChild(target.firstChild);
                        target.appendChild(wrapper);
                        target = wrapper;
                    });
                }

                if (forceUnwrap || (tag === 'A' && !href)) {
                    el.replaceWith(...Array.from(el.childNodes));
                    continue;
                }

                if (tag === 'STRIKE') {
                    const strike = doc.createElement('s');
                    while (el.firstChild) strike.appendChild(el.firstChild);
                    el.replaceWith(strike);
                    continue;
                }

                if (unwrap.has(tag)) {
                    el.replaceWith(...Array.from(el.childNodes));
                    continue;
                }

                if (containers.has(tag)) {
                    if (hasBlockChild) {
                        el.replaceWith(...Array.from(el.childNodes));
                        continue;
                    }
                    const paragraph = doc.createElement('p');
                    while (el.firstChild) paragraph.appendChild(el.firstChild);
                    el.replaceWith(paragraph);
                    continue;
                }

                if (!blocks.has(tag) && !inline.has(tag)) {
                    el.replaceWith(...Array.from(el.childNodes));
                }
            }

            const isInlineNode = (node) => {
                if (node.nodeType === 3) return Boolean(node.nodeValue.trim());
                if (node.nodeType !== 1) return false;
                return inline.has(node.tagName.toUpperCase());
            };
            let group = null;
            Array.from(body.childNodes).forEach((node) => {
                if (node.nodeType === 8) {
                    node.remove();
                    return;
                }
                if (node.nodeType === 3 && !node.nodeValue.trim()) {
                    if (group) group.appendChild(node);
                    return;
                }
                if (!isInlineNode(node)) {
                    group = null;
                    return;
                }
                if (!group) {
                    group = doc.createElement('p');
                    body.insertBefore(group, node);
                }
                group.appendChild(node);
            });

            const trimStart = (node) => {
                if (node.nodeType === 3) {
                    node.nodeValue = node.nodeValue.replace(/^\s+/, '');
                    return node.nodeValue.length > 0;
                }
                if (node.nodeType !== 1) return false;
                if (['PRE', 'CODE', 'BR', 'IMG', 'HR'].includes(node.tagName)) return true;
                return Array.from(node.childNodes).some((child) => trimStart(child));
            };
            const trimEnd = (node) => {
                if (node.nodeType === 3) {
                    node.nodeValue = node.nodeValue.replace(/\s+$/, '');
                    return node.nodeValue.length > 0;
                }
                if (node.nodeType !== 1) return false;
                if (['PRE', 'CODE', 'BR', 'IMG', 'HR'].includes(node.tagName)) return true;
                return Array.from(node.childNodes).reverse().some((child) => trimEnd(child));
            };

            Array.from(body.querySelectorAll('p, h1, h2, h3, h4, h5, h6, blockquote, li, figcaption, th, td')).forEach((el) => {
                el.normalize();
                const textNodes = [];
                const collect = (node) => {
                    Array.from(node.childNodes).forEach((child) => {
                        if (child.nodeType === 3) textNodes.push(child);
                        else if (child.nodeType === 1 && !['PRE', 'CODE'].includes(child.tagName)) collect(child);
                    });
                };
                collect(el);
                textNodes.forEach((node) => {
                    node.nodeValue = node.nodeValue.replace(/[ \t\r\n]+/g, ' ');
                });
                trimStart(el);
                trimEnd(el);
            });

            return body.innerHTML.trim();
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

        _buildExportHtml() {
            const title = escapeHtml(this._el.title.value.trim() || 'Documento sin título');
            return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title}</title>
<style>
:root { color-scheme: light; }
body { margin: 0; background: #f3f2ee; }
${EXPORT_STYLES}
</style>
</head>
<body>
<main class="wysing-export">
${this._el.editor.innerHTML}
</main>
</body>
</html>`;
        }

        _downloadBlob(filename, parts, type) {
            const blob = new Blob(parts, { type });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.setTimeout(() => URL.revokeObjectURL(url), 2000);
        }

        _downloadHtml() {
            this._downloadBlob(`${slugify(this._el.title.value)}.html`, [this._buildExportHtml()], 'text/html;charset=utf-8');
            this._toast('Documento HTML descargado');
        }

        _buildWordHtml() {
            const title = escapeHtml(this._el.title.value.trim() || 'Documento sin título');
            const body = this._el.editor.innerHTML;
            return `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40" lang="es">
<head>
<meta charset="UTF-8">
<meta name="ProgId" content="Word.Document">
<meta name="Generator" content="Microsoft Word 15">
<meta name="Originator" content="Microsoft Word 15">
<title>${title}</title>
<!--[if gte mso 9]>
<xml>
<w:WordDocument>
<w:View>Print</w:View>
<w:Zoom>100</w:Zoom>
<w:DoNotOptimizeForBrowser/>
</w:WordDocument>
</xml>
<![endif]-->
<style>
@page WordSection1 { size: 595.3pt 841.9pt; margin: 72pt 72pt 72pt 72pt; }
div.WordSection1 { page: WordSection1; }
body { margin: 0; background: #fff; color: #222; font-family: Calibri, "Segoe UI", Arial, sans-serif; font-size: 11pt; line-height: 1.5; }
p { margin: 0 0 8pt; }
h1, h2, h3 { font-family: Calibri, "Segoe UI", Arial, sans-serif; color: #1f2328; line-height: 1.2; }
h1 { font-size: 22pt; margin: 14pt 0 6pt; }
h2 { font-size: 16pt; margin: 14pt 0 6pt; }
h3 { font-size: 13pt; margin: 12pt 0 5pt; }
a { color: #2f5d8a; text-decoration: underline; }
ul, ol { margin: 0 0 8pt 18pt; padding: 0; }
li { margin: 0 0 3pt; }
blockquote { margin: 10pt 0; padding: 6pt 12pt; background: #f7f5f0; border-left: 3pt solid #cfd6cd; color: #444; }
pre { margin: 8pt 0; padding: 8pt 10pt; background: #f4f2ec; border: 0.5pt solid #ddd8cf; white-space: pre-wrap; font-family: Consolas, "Courier New", monospace; font-size: 9.5pt; }
code { font-family: Consolas, "Courier New", monospace; font-size: 9.5pt; }
pre code { font-size: 9.5pt; }
hr { margin: 14pt 0; border: 0; border-top: 0.75pt solid #cfcac1; }
img { max-width: 100%; height: auto; }
table { width: 100%; border-collapse: collapse; }
td, th { padding: 4pt 6pt; border: 0.5pt solid #d6d1c8; }
</style>
</head>
<body>
<div class="WordSection1">
${body}
</div>
</body>
</html>`;
        }

        _downloadWord() {
            this._downloadBlob(`${slugify(this._el.title.value)}.doc`, ['\ufeff', this._buildWordHtml()], 'application/msword;charset=utf-8');
            this._toast('Documento Word descargado');
        }

        _loadHtml2Pdf() {
            if (window.html2pdf) return Promise.resolve(window.html2pdf);
            if (this._html2PdfPromise) return this._html2PdfPromise;
            this._html2PdfPromise = new Promise((resolve, reject) => {
                const script = document.createElement('script');
                script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
                script.async = true;
                script.onload = () => {
                    if (window.html2pdf) resolve(window.html2pdf);
                    else reject(new Error('html2pdf no disponible'));
                };
                script.onerror = () => {
                    script.remove();
                    reject(new Error('No se pudo cargar html2pdf'));
                };
                document.head.appendChild(script);
            }).catch((error) => {
                this._html2PdfPromise = null;
                throw error;
            });
            return this._html2PdfPromise;
        }

        _buildPdfElement() {
            const element = document.createElement('div');
            element.className = 'wysing-export';
            element.style.cssText = 'position:fixed;left:-10000px;top:0;width:794px;max-width:none;margin:0;padding:56px;background:#fff;border:0;border-radius:0;box-shadow:none;';
            element.innerHTML = this._el.editor.innerHTML;
            return element;
        }

        _waitForImages(element) {
            const pending = Array.from(element.images || [])
                .filter((image) => !image.complete)
                .map((image) => new Promise((resolve) => {
                    const done = () => resolve();
                    image.addEventListener('load', done, { once: true });
                    image.addEventListener('error', done, { once: true });
                    window.setTimeout(done, 3000);
                }));
            return Promise.all(pending);
        }

        async _downloadPdf() {
            if (this._pdfBusy) return;
            this._pdfBusy = true;
            this._toast('Generando PDF…');
            let element = null;
            let style = null;
            try {
                const html2pdf = await this._loadHtml2Pdf();
                style = document.createElement('style');
                style.textContent = EXPORT_STYLES;
                document.head.appendChild(style);
                element = this._buildPdfElement();
                document.body.appendChild(element);
                await this._waitForImages(element);
                await html2pdf().set({
                    margin: [10, 10, 10, 10],
                    filename: `${slugify(this._el.title.value)}.pdf`,
                    image: { type: 'jpeg', quality: 0.98 },
                    html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff', logging: false },
                    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
                    pagebreak: { mode: ['css', 'legacy'] }
                }).from(element).save();
                this._toast('Documento PDF descargado');
            } catch (error) {
                this._toast('No se pudo generar el PDF; usando impresión');
                window.print();
            } finally {
                if (element) element.remove();
                if (style) style.remove();
                this._pdfBusy = false;
            }
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

        _applyInlineStyle(property, value) {
            const selection = window.getSelection();
            if (!selection || selection.isCollapsed || !selection.rangeCount) return;
            const range = selection.getRangeAt(0);
            if (!this._el.editor.contains(range.commonAncestorContainer)) return;
            const span = document.createElement('span');
            span.style[property] = value;
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

        _applyFontSize(px) {
            this._applyInlineStyle('fontSize', `${px}px`);
        }

        _getSelectionNode() {
            const selection = window.getSelection();
            if (!selection || !selection.rangeCount) return null;
            let node = selection.anchorNode;
            if (node && node.nodeType === 3) node = node.parentElement;
            return node && this._el.editor.contains(node) ? node : null;
        }

        _getSelectionStyle(property) {
            const node = this._getSelectionNode();
            if (!node) return '';
            let el = node;
            while (el && el !== this._el.editor) {
                if (el.style && el.style[property]) return el.style[property];
                el = el.parentElement;
            }
            return '';
        }

        _getSelectionFontSize() {
            const px = parseFloat(this._getSelectionStyle('fontSize'));
            if (px) return String(Math.round(px));
            const node = this._getSelectionNode();
            if (!node) return '';
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
            this._applyInlineStyle('fontFamily', family);
        }

        _getSelectionFontFamily() {
            return this._getSelectionStyle('fontFamily');
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
                }),
                density: this._createDropdown(this._el.settingsDensity, (value) => {
                    this._applyDensity(value);
                })
            };
            if (this._dropdowns.density) this._dropdowns.density.value = this._density;
            this._applyDensity(this._density);
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
                    const modal = which === 'link' ? el.linkModal : which === 'image' ? el.imageModal : which === 'confirm' ? el.confirmModal : null;
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
                const data = event.clipboardData;
                if (!data) return;
                const items = Array.from(data.items || []);
                const imageItem = items.find((item) => item.type && item.type.startsWith('image/'));
                if (imageItem) {
                    const file = imageItem.getAsFile();
                    if (!file) return;
                    event.preventDefault();
                    this._saveSelection();
                    this._insertImageFile(file);
                    return;
                }
                const html = data.getData('text/html');
                if (!html) return;
                const cleaned = this._cleanPastedHtml(html);
                if (!cleaned) return;
                event.preventDefault();
                this._saveSelection();
                this._insertHtml(cleaned);
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

            el.title.addEventListener('input', () => {
                this._syncActiveDocTitle();
                this._scheduleChange();
                this._setEditing(true);
            });
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
                this._confirm('¿Crear un documento nuevo? El actual se guardará en el historial.', () => {
                    this._newDocument();
                    this._toast('Documento nuevo');
                });
            });

            if (el.confirmCancel) el.confirmCancel.addEventListener('click', () => this._closeModal(el.confirmModal));
            if (el.confirmClose) el.confirmClose.addEventListener('click', () => this._closeModal(el.confirmModal));
            if (el.confirmOk) el.confirmOk.addEventListener('click', () => {
                const callback = this._confirmCallback;
                this._confirmCallback = null;
                this._closeModal(el.confirmModal);
                if (typeof callback === 'function') callback();
            });

            el.docsBtn.addEventListener('click', () => this._setDocsPanel(el.docsPanel.hidden));

            if (el.docsPanelClose) el.docsPanelClose.addEventListener('click', () => this._setDocsPanel(false));

            el.docsNewBtn.addEventListener('click', () => this._newDocument());

            el.clearBtn.addEventListener('click', () => {
                const doClear = () => {
                    this._resetDocument('Documento sin título');
                    this._toast('Documento vaciado');
                };
                if (this._confirmOnClear) {
                    this._confirm('¿Vaciar el documento? Esta acción no se puede deshacer.', doClear);
                } else {
                    doClear();
                }
            });

            el.copyBtn.addEventListener('click', () => this._copyHtml());
            el.downloadBtn.addEventListener('click', (event) => {
                event.stopPropagation();
                if (this._downloadPending) return;
                this._toggleDownloadMenu();
            });
            if (el.downloadMenu) {
                el.downloadMenu.addEventListener('click', (event) => {
                    const item = event.target.closest('[data-download]');
                    if (!item) return;
                    this._startDownload(item);
                });
            }
            if (el.settingsBtn) {
                el.settingsBtn.addEventListener('click', (event) => {
                    event.stopPropagation();
                    this._openSettingsModal();
                });
            }
            if (el.settingsModal) {
                el.settingsModal.addEventListener('click', (event) => {
                    const segment = event.target.closest('.settings__segment');
                    if (!segment) return;
                    const group = segment.closest('.settings__segmented');
                    if (!group) return;
                    if (group === el.settingsTheme) {
                        const theme = segment.dataset.theme;
                        if (theme) this._applyTheme(theme);
                        return;
                    }
                    if (group === el.settingsWidth) {
                        const width = segment.dataset.width;
                        if (width) this._applyPageWidth(width);
                        return;
                    }
                    group.querySelectorAll('.settings__segment').forEach((button) => {
                        const active = button === segment;
                        button.classList.toggle('is-active', active);
                        button.setAttribute('aria-pressed', String(active));
                    });
                });
                if (el.settingsClose) el.settingsClose.addEventListener('click', () => this._closeSettingsModal());
                if (el.settingsDone) el.settingsDone.addEventListener('click', () => this._closeSettingsModal());
                if (el.settingsRange) {
                    el.settingsRange.addEventListener('input', () => {
                        this._applyEditorFontSize(el.settingsRange.value);
                    });
                }
                if (el.settingsAutosave) {
                    el.settingsAutosave.addEventListener('change', () => {
                        this._autosave = el.settingsAutosave.checked;
                    });
                }
                if (el.settingsConfirm) {
                    el.settingsConfirm.addEventListener('change', () => {
                        this._confirmOnClear = el.settingsConfirm.checked;
                    });
                }
                if (el.settingsAnimations) {
                    el.settingsAnimations.addEventListener('change', () => {
                        this._applyAnimations(el.settingsAnimations.checked);
                    });
                }
                if (el.settingsReset) {
                    el.settingsReset.addEventListener('click', () => {
                        if (el.settingsTheme) this._applyTheme('dark');
                        if (el.settingsWidth) this._applyPageWidth('normal');
                        if (this._dropdowns && this._dropdowns.density) this._dropdowns.density.value = 'comoda';
                        if (el.settingsRange) {
                            el.settingsRange.value = '16';
                            this._applyEditorFontSize(16);
                        }
                        if (el.settingsAutosave) { el.settingsAutosave.checked = true; this._autosave = true; }
                        if (el.settingsConfirm) { el.settingsConfirm.checked = true; this._confirmOnClear = true; }
                        if (el.settingsAnimations) { el.settingsAnimations.checked = true; this._applyAnimations(true); }
                        el.settingsModal.querySelectorAll('.settings__segmented').forEach((group) => {
                            if (group === el.settingsTheme || group === el.settingsWidth) return;
                            group.querySelectorAll('.settings__segment').forEach((button, index) => {
                                const active = index === 0;
                                button.classList.toggle('is-active', active);
                                button.setAttribute('aria-pressed', String(active));
                            });
                        });
                        el.settingsModal.querySelectorAll('.settings-switch input').forEach((input) => {
                            input.checked = true;
                        });
                        if (this._dropdowns && this._dropdowns.density) this._dropdowns.density.value = 'comoda';
                        if (el.settingsRange) {
                            el.settingsRange.value = '16';
                            if (el.settingsRangeValue) el.settingsRangeValue.textContent = '16 px';
                        }
                    });
                }
            }
            try {
                const mq = window.matchMedia('(prefers-color-scheme: light)');
                const onMq = () => { if (this._themePreference === 'system') this._applyTheme('system'); };
                if (mq.addEventListener) mq.addEventListener('change', onMq); else if (mq.addListener) mq.addListener(onMq);
            } catch (e) { }
            el.printBtn.addEventListener('click', () => window.print());

            if (el.toolbarMoreBtn) {
                el.toolbarMoreBtn.addEventListener('click', (event) => {
                    event.stopPropagation();
                    if (!el.toolbarMoreMenu) return;
                    const open = el.toolbarMoreMenu.hidden;
                    el.toolbarMoreMenu.hidden = !open;
                    if (open) this._positionToolbarMoreMenu();
                    el.toolbarMoreBtn.setAttribute('aria-expanded', String(open));
                });
            }

            this._bindDoc('click', (event) => {
                if (el.toolbarMoreMenu && !event.target.closest('[data-wysing="toolbar-more"]')) {
                    el.toolbarMoreMenu.hidden = true;
                    if (el.toolbarMoreBtn) el.toolbarMoreBtn.setAttribute('aria-expanded', 'false');
                }
            });
            el.codeBtn.addEventListener('click', () => this._setCodePanel(el.codePanel.hidden));

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
                    this._saveCurrentDoc();
                    this._persistDocs();
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
