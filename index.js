(() => {
    "use strict";

    const $ = (id) => document.getElementById(id);

    const els = {
        stage: $("stage"),
        player: document.querySelector(".player"),
        media: $("media"),
        empty: $("empty"),
        audioArt: $("audioArt"),
        audioTitle: $("audioTitle"),
        spinner: $("spinner"),
        controls: $("controls"),
        nowLabel: $("nowLabel"),
        nowTitle: $("nowTitle"),
        badges: $("badges"),
        badgeType: $("badgeType"),
        badgeMeta: $("badgeMeta"),
        timeline: $("timeline"),
        bufferBar: $("bufferBar"),
        fillBar: $("fillBar"),
        thumbDot: $("thumbDot"),
        timelineTip: $("timelineTip"),
        playBtn: $("playBtn"),
        backBtn: $("backBtn"),
        fwdBtn: $("fwdBtn"),
        muteBtn: $("muteBtn"),
        volume: $("volume"),
        menuWrap: $("menuWrap"),
        speedBtn: $("speedBtn"),
        speedMenu: $("speedMenu"),
        loopBtn: $("loopBtn"),
        pipBtn: $("pipBtn"),
        fsBtn: $("fsBtn"),
        curTime: $("curTime"),
        durTime: $("durTime"),
        fileInput: $("fileInput"),
        openBtn: $("openBtn"),
        emptyBtn: $("emptyBtn"),
        clearBtn: $("clearBtn"),
        queueList: $("queueList"),
        queueEmpty: $("queueEmpty"),
        queueCount: $("queueCount"),
        toast: $("toast")
    };

    const AUDIO_EXT = /\.(mp3|wav|flac|m4a|aac|ogg|oga|opus|wma|aiff?)$/i;
    const MEDIA_EXT = /\.(mp4|m4v|webm|mov|mkv|avi|ogv|mp3|wav|flac|m4a|aac|ogg|oga|opus|wma|aiff?)$/i;
    const IDLE_DELAY = 2600;

    const state = {
        tracks: [],
        currentId: null,
        loop: false,
        rate: 1,
        lastVolume: 1,
        hideTimer: 0,
        dragDepth: 0,
        seeking: false,
        wasPlayingBeforeSeek: false,
        resumedPlayback: false
    };

    /* ---------- Helpers ---------- */

    function uid() {
        if (window.crypto && typeof window.crypto.randomUUID === "function") {
            return window.crypto.randomUUID();
        }
        return "t-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 9);
    }

    function formatTime(seconds) {
        if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
        const total = Math.floor(seconds);
        const s = total % 60;
        const m = Math.floor(total / 60) % 60;
        const h = Math.floor(total / 3600);
        if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
        return `${m}:${String(s).padStart(2, "0")}`;
    }

    function formatBytes(bytes) {
        if (!Number.isFinite(bytes) || bytes <= 0) return "0 MB";
        const units = ["B", "KB", "MB", "GB", "TB"];
        const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
        const value = bytes / Math.pow(1024, i);
        const decimals = i >= 2 && value < 100 ? 1 : 0;
        return `${value.toFixed(decimals)} ${units[i]}`;
    }

    function prettyName(name) {
        return name.replace(/\.[^./\\]+$/, "");
    }

    function hashHue(text) {
        let hash = 0;
        for (let i = 0; i < text.length; i += 1) {
            hash = (hash * 31 + text.charCodeAt(i)) % 360;
        }
        return 215 + (hash % 115);
    }

    function isAudioFile(file) {
        if (file.type.startsWith("audio/")) return true;
        if (file.type.startsWith("video/")) return false;
        return AUDIO_EXT.test(file.name);
    }

    function isSupported(file) {
        return file.type.startsWith("video/") ||
            file.type.startsWith("audio/") ||
            MEDIA_EXT.test(file.name);
    }

    function getTrack() {
        return state.tracks.find((track) => track.id === state.currentId) || null;
    }

    function clamp(value, min, max) {
        return Math.min(max, Math.max(min, value));
    }

    let toastTimer = 0;
    function toast(message, kind = "info") {
        els.toast.textContent = message;
        els.toast.dataset.kind = kind;
        els.toast.classList.add("is-visible");
        window.clearTimeout(toastTimer);
        toastTimer = window.setTimeout(() => els.toast.classList.remove("is-visible"), 3200);
    }

    function setNowLabel(text) {
        els.nowLabel.textContent = text;
    }

    /* ---------- Files & queue ---------- */

    function addFiles(fileList) {
        const files = Array.from(fileList || []);
        if (!files.length) return;

        let added = 0;
        let rejected = 0;
        const firstNew = [];

        files.forEach((file) => {
            if (!isSupported(file)) {
                rejected += 1;
                return;
            }

            const key = `${file.name}|${file.size}|${file.lastModified}`;
            if (state.tracks.some((track) => track.key === key)) return;

            const track = {
                id: uid(),
                key,
                file,
                kind: isAudioFile(file) ? "audio" : "video",
                url: URL.createObjectURL(file)
            };

            state.tracks.push(track);
            firstNew.push(track);
            added += 1;
        });

        els.fileInput.value = "";

        if (added > 0 && !state.currentId) {
            playTrack(firstNew[0].id, true);
        }

        renderQueue();

        if (rejected > 0) {
            toast(
                rejected === 1
                    ? "Ese formato no es compatible. Prueba con MP4, WebM, MP3 o WAV."
                    : `${rejected} archivos no son compatibles. Prueba con MP4, WebM, MP3 o WAV.`,
                "error"
            );
        } else if (added > 0) {
            toast(
                `${added} ${added === 1 ? "archivo agregado" : "archivos agregados"} a la cola`,
                "success"
            );
        }
    }

    function renderQueue() {
        els.queueList.textContent = "";

        state.tracks.forEach((track) => {
            const isActive = track.id === state.currentId;
            const isPlaying = isActive && !els.media.paused && !els.media.ended;

            const item = document.createElement("li");
            item.className = "track";
            if (isActive) item.classList.add("is-active");
            if (isPlaying) item.classList.add("is-playing");
            item.dataset.id = track.id;

            const main = document.createElement("button");
            main.type = "button";
            main.className = "track__main";
            main.setAttribute("aria-label", `Reproducir ${track.file.name}`);
            main.innerHTML =
                `<span class="track__icon"><span class="miller-icon" data-icon="${track.kind === "audio" ? "music" : "video"}" aria-hidden="true"></span></span>` +
                `<span class="track__text"><span class="track__name"></span><span class="track__sub"></span></span>` +
                `<span class="track__bars" aria-hidden="true"><i></i><i></i><i></i></span>`;

            main.querySelector(".track__name").textContent = track.file.name;
            main.querySelector(".track__sub").textContent =
                `${track.kind === "audio" ? "Audio" : "Video"} · ${formatBytes(track.file.size)}`;

            const remove = document.createElement("button");
            remove.type = "button";
            remove.className = "track__remove";
            remove.setAttribute("aria-label", `Quitar ${track.file.name}`);
            remove.title = "Quitar de la cola";
            remove.innerHTML = `<span class="miller-icon" data-icon="close" aria-hidden="true"></span>`;

            item.append(main, remove);
            els.queueList.appendChild(item);
        });

        const count = state.tracks.length;
        els.queueEmpty.hidden = count > 0;
        els.queueList.hidden = count === 0;
        els.queueCount.textContent = count === 0
            ? "Sin archivos"
            : `${count} ${count === 1 ? "archivo" : "archivos"}`;
        els.clearBtn.disabled = count === 0;
    }

    function syncQueuePlaying() {
        const playing = !els.media.paused && !els.media.ended;
        els.queueList.querySelectorAll(".track").forEach((item) => {
            item.classList.toggle("is-playing", playing && item.dataset.id === state.currentId);
        });
    }

    function removeTrack(id) {
        const index = state.tracks.findIndex((track) => track.id === id);
        if (index < 0) return;

        const [removed] = state.tracks.splice(index, 1);

        if (id !== state.currentId) {
            URL.revokeObjectURL(removed.url);
            renderQueue();
            return;
        }

        const wasPlaying = !els.media.paused && !els.media.ended;
        resetPlayer();
        URL.revokeObjectURL(removed.url);

        const next = state.tracks[index] || state.tracks[index - 1] || null;
        if (next) {
            playTrack(next.id, wasPlaying);
        } else {
            renderQueue();
        }
    }

    function clearAll() {
        if (!state.tracks.length) return;
        const removed = state.tracks;
        state.tracks = [];
        resetPlayer();
        removed.forEach((track) => URL.revokeObjectURL(track.url));
        renderQueue();
        toast("Cola vaciada");
    }

    /* ---------- Playback ---------- */

    function playTrack(id, autoplay = true) {
        const track = state.tracks.find((item) => item.id === id);
        if (!track) return;

        state.currentId = id;

        els.stage.classList.add("is-loaded");
        els.stage.classList.toggle("is-audio", track.kind === "audio");
        els.stage.classList.remove("is-idle", "is-buffering");
        els.stage.style.setProperty("--art-hue", String(hashHue(track.file.name)));

        els.nowTitle.textContent = track.file.name;
        els.nowTitle.title = track.file.name;
        els.audioTitle.textContent = prettyName(track.file.name);
        els.badgeType.textContent = track.kind === "audio" ? "Audio" : "Video";
        els.badgeMeta.textContent = formatBytes(track.file.size);
        els.badges.hidden = false;
        els.empty.setAttribute("aria-hidden", "true");

        els.pipBtn.hidden = track.kind === "audio" || !document.pictureInPictureEnabled;

        setNowLabel("Listo para reproducir");
        document.title = `${track.file.name} — Code Player`;

        els.media.src = track.url;
        els.media.defaultPlaybackRate = state.rate;
        els.media.playbackRate = state.rate;
        els.media.load();

        updateTimeline();
        updateBuffer();
        updateVolumeUI();
        renderQueue();
        setMediaSession(track);

        if (autoplay) {
            const attempt = els.media.play();
            if (attempt && typeof attempt.catch === "function") {
                attempt.catch((error) => {
                    if (error && error.name === "NotAllowedError") {
                        setNowLabel("Pulsa reproducir para comenzar");
                    }
                });
            }
        }
    }

    function togglePlay() {
        if (!state.currentId) {
            els.fileInput.click();
            return;
        }

        if (els.media.paused) {
            if (els.media.ended) els.media.currentTime = 0;
            const attempt = els.media.play();
            if (attempt && typeof attempt.catch === "function") {
                attempt.catch(() => toast("No se pudo iniciar la reproducción", "error"));
            }
        } else {
            els.media.pause();
        }
    }

    function seekBy(seconds) {
        if (!state.currentId) return;
        const duration = els.media.duration;
        if (!Number.isFinite(duration) || duration <= 0) return;
        els.media.currentTime = clamp(els.media.currentTime + seconds, 0, duration);
        showControls();
    }

    function playAdjacent(direction) {
        if (!state.tracks.length) return;
        const index = state.tracks.findIndex((track) => track.id === state.currentId);
        if (index < 0) {
            playTrack(state.tracks[0].id, true);
            return;
        }
        const nextIndex = (index + direction + state.tracks.length) % state.tracks.length;
        playTrack(state.tracks[nextIndex].id, true);
    }

    function resetPlayer() {
        state.currentId = null;
        els.media.pause();
        els.media.removeAttribute("src");
        els.media.load();

        els.stage.classList.remove("is-loaded", "is-audio", "is-playing", "is-buffering", "is-idle");
        els.player.classList.remove("is-playing");
        els.stage.style.removeProperty("--art-hue");

        setNowLabel("Sin reproducción");
        els.nowTitle.textContent = "Selecciona un archivo para comenzar";
        els.nowTitle.removeAttribute("title");
        els.audioTitle.textContent = "";
        els.badges.hidden = true;
        els.badgeType.textContent = "";
        els.badgeMeta.textContent = "";
        els.empty.setAttribute("aria-hidden", "false");

        els.curTime.textContent = "0:00";
        els.durTime.textContent = "0:00";
        els.timeline.style.setProperty("--p", "0%");
        els.timeline.setAttribute("aria-valuenow", "0");
        els.timeline.setAttribute("aria-valuetext", "0:00 de 0:00");
        els.bufferBar.style.width = "0%";
        els.timelineTip.textContent = "0:00";
        els.playBtn.setAttribute("aria-label", "Reproducir");
        els.pipBtn.hidden = !document.pictureInPictureEnabled;

        window.clearTimeout(state.hideTimer);
        document.title = "Code Player — Reproductor local";

        if ("mediaSession" in navigator) {
            try {
                navigator.mediaSession.metadata = null;
                navigator.mediaSession.playbackState = "none";
            } catch (error) {
                /* noop */
            }
        }
    }

    function syncPlayingUI() {
        const playing = !els.media.paused && !els.media.ended;

        els.stage.classList.toggle("is-playing", playing);
        els.player.classList.toggle("is-playing", playing);
        els.playBtn.setAttribute("aria-label", playing ? "Pausar" : "Reproducir");

        syncQueuePlaying();

        if (playing) {
            scheduleHide();
        } else {
            window.clearTimeout(state.hideTimer);
            els.stage.classList.remove("is-idle");
        }

        if ("mediaSession" in navigator) {
            try {
                navigator.mediaSession.playbackState = playing ? "playing" : "paused";
            } catch (error) {
                /* noop */
            }
        }
    }

    /* ---------- Timeline ---------- */

    function updateTimeline() {
        const duration = els.media.duration;
        const current = els.media.currentTime;
        const hasDuration = Number.isFinite(duration) && duration > 0;
        const ratio = hasDuration ? clamp(current / duration, 0, 1) : 0;

        els.timeline.style.setProperty("--p", `${(ratio * 100).toFixed(3)}%`);
        els.curTime.textContent = formatTime(current);
        els.durTime.textContent = hasDuration ? formatTime(duration) : "0:00";
        els.timeline.setAttribute("aria-valuenow", String(Math.round(ratio * 100)));
        els.timeline.setAttribute("aria-valuetext", `${formatTime(current)} de ${formatTime(hasDuration ? duration : 0)}`);
    }

    function updateBuffer() {
        const duration = els.media.duration;
        const current = els.media.currentTime;
        let bufferedEnd = 0;

        if (els.media.buffered && els.media.buffered.length) {
            for (let i = 0; i < els.media.buffered.length; i += 1) {
                if (els.media.buffered.start(i) <= current + 0.5 && els.media.buffered.end(i) >= current) {
                    bufferedEnd = els.media.buffered.end(i);
                    break;
                }
            }
            if (!bufferedEnd) {
                bufferedEnd = els.media.buffered.end(els.media.buffered.length - 1);
            }
        }

        const percent = Number.isFinite(duration) && duration > 0
            ? clamp((bufferedEnd / duration) * 100, 0, 100)
            : 0;
        els.bufferBar.style.width = `${percent}%`;
    }

    function ratioFromPointer(clientX) {
        const rect = els.timeline.getBoundingClientRect();
        if (!rect.width) return 0;
        return clamp((clientX - rect.left) / rect.width, 0, 1);
    }

    function updateTip(ratio) {
        const duration = els.media.duration;
        if (!Number.isFinite(duration) || duration <= 0) return;
        els.timelineTip.textContent = formatTime(ratio * duration);
        els.timelineTip.style.left = `${ratio * 100}%`;
    }

    function applySeek(ratio) {
        const duration = els.media.duration;
        if (!Number.isFinite(duration) || duration <= 0) return;
        els.media.currentTime = ratio * duration;
        updateTimeline();
    }

    els.timeline.addEventListener("pointerdown", (event) => {
        if (event.button !== 0 || !state.currentId) return;
        const duration = els.media.duration;
        if (!Number.isFinite(duration) || duration <= 0) return;

        event.preventDefault();
        state.seeking = true;
        state.wasPlayingBeforeSeek = !els.media.paused && !els.media.ended;
        state.resumedPlayback = false;

        if (state.wasPlayingBeforeSeek) els.media.pause();

        els.timeline.classList.add("is-dragging");
        try {
            els.timeline.setPointerCapture(event.pointerId);
        } catch (error) {
            /* captura de puntero no disponible */
        }

        const ratio = ratioFromPointer(event.clientX);
        updateTip(ratio);
        applySeek(ratio);
        showControls();
    });

    els.timeline.addEventListener("pointermove", (event) => {
        if (!state.currentId) return;
        const ratio = ratioFromPointer(event.clientX);
        updateTip(ratio);
        if (state.seeking) applySeek(ratio);
    });

    function endSeek(event) {
        if (!state.seeking) return;
        state.seeking = false;
        els.timeline.classList.remove("is-dragging");

        if (els.timeline.hasPointerCapture(event.pointerId)) {
            els.timeline.releasePointerCapture(event.pointerId);
        }
        if (state.wasPlayingBeforeSeek && !state.resumedPlayback) {
            state.resumedPlayback = true;
            const attempt = els.media.play();
            if (attempt && typeof attempt.catch === "function") attempt.catch(() => {});
        }

        state.wasPlayingBeforeSeek = false;
        showControls();
    }

    els.timeline.addEventListener("pointerup", endSeek);
    els.timeline.addEventListener("pointercancel", endSeek);
    els.timeline.addEventListener("pointerleave", () => {
        if (!state.seeking && !els.timeline.matches(":hover")) {
            els.timelineTip.textContent = "0:00";
        }
    });

    /* ---------- Volume ---------- */

    function updateVolumeUI() {
        const volume = els.media.muted ? 0 : els.media.volume;
        els.volume.value = String(volume);
        els.volume.style.setProperty("--v", `${Math.round(volume * 100)}%`);
        els.muteBtn.dataset.muted = String(volume === 0);
        els.muteBtn.setAttribute("aria-label", volume === 0 ? "Activar sonido" : "Silenciar");
        els.muteBtn.title = volume === 0 ? "Activar sonido (M)" : "Silenciar (M)";
    }

    function setVolume(value) {
        const next = clamp(value, 0, 1);
        els.media.muted = false;
        els.media.volume = next;
        if (next > 0) state.lastVolume = next;
    }

    els.volume.addEventListener("input", () => {
        setVolume(Number(els.volume.value));
    });

    els.muteBtn.addEventListener("click", () => {
        if (els.media.muted || els.media.volume === 0) {
            els.media.muted = false;
            els.media.volume = state.lastVolume > 0 ? state.lastVolume : 0.8;
        } else {
            state.lastVolume = els.media.volume;
            els.media.muted = true;
        }
        showControls();
    });

    /* ---------- Speed menu ---------- */

    function openMenu() {
        els.menuWrap.classList.add("is-open");
        els.speedBtn.setAttribute("aria-expanded", "true");
        showControls();
    }

    function closeMenu() {
        els.menuWrap.classList.remove("is-open");
        els.speedBtn.setAttribute("aria-expanded", "false");
    }

    function markSpeedActive(rate) {
        els.speedMenu.querySelectorAll("button").forEach((button) => {
            const active = Number(button.dataset.speed) === rate;
            button.classList.toggle("is-active", active);
            button.setAttribute("aria-checked", String(active));
        });
        els.speedBtn.textContent = `${rate}×`;
    }

    els.speedBtn.addEventListener("click", (event) => {
        event.stopPropagation();
        if (els.menuWrap.classList.contains("is-open")) closeMenu();
        else openMenu();
    });

    els.speedMenu.addEventListener("click", (event) => {
        const button = event.target.closest("button[data-speed]");
        if (!button) return;
        const rate = Number(button.dataset.speed);
        if (!Number.isFinite(rate)) return;

        state.rate = rate;
        els.media.defaultPlaybackRate = rate;
        els.media.playbackRate = rate;
        markSpeedActive(rate);
        closeMenu();
        scheduleHide();
    });

    document.addEventListener("click", (event) => {
        if (!els.menuWrap.contains(event.target)) closeMenu();
    });

    /* ---------- Loop, PiP, fullscreen ---------- */

    function setLoop(value) {
        state.loop = Boolean(value);
        els.media.loop = state.loop;
        els.loopBtn.classList.toggle("is-active", state.loop);
        els.loopBtn.setAttribute("aria-pressed", String(state.loop));
    }

    els.loopBtn.addEventListener("click", () => {
        setLoop(!state.loop);
        showControls();
    });

    els.pipBtn.addEventListener("click", async () => {
        try {
            if (document.pictureInPictureElement) {
                await document.exitPictureInPicture();
            } else if (typeof els.media.requestPictureInPicture === "function") {
                await els.media.requestPictureInPicture();
            }
        } catch (error) {
            toast("Picture-in-Picture no está disponible para este archivo", "error");
        }
    });

    els.fsBtn.addEventListener("click", async () => {
        try {
            if (document.fullscreenElement) {
                await document.exitFullscreen();
            } else if (els.stage.requestFullscreen) {
                await els.stage.requestFullscreen();
            }
        } catch (error) {
            toast("La pantalla completa no está disponible", "error");
        }
    });

    document.addEventListener("fullscreenchange", () => {
        const isFullscreen = document.fullscreenElement === els.stage;
        els.stage.classList.toggle("is-fs", isFullscreen);
        const label = isFullscreen ? "Salir de pantalla completa" : "Pantalla completa";
        els.fsBtn.setAttribute("aria-label", label);
        els.fsBtn.title = isFullscreen ? `${label} (F)` : `${label} (F)`;
        showControls();
    });

    /* ---------- Controls visibility ---------- */

    function showControls() {
        els.stage.classList.remove("is-idle");
        scheduleHide();
    }

    function scheduleHide() {
        window.clearTimeout(state.hideTimer);
        if (!state.currentId || els.media.paused || els.media.ended) return;

        state.hideTimer = window.setTimeout(() => {
            if (els.media.paused || !state.currentId) return;
            if (els.controls.contains(document.activeElement)) return;
            if (els.controls.matches(":hover")) return;
            if (els.menuWrap.classList.contains("is-open")) return;
            els.stage.classList.add("is-idle");
        }, IDLE_DELAY);
    }

    els.stage.addEventListener("pointermove", showControls);
    els.stage.addEventListener("pointerdown", showControls);
    els.stage.addEventListener("pointerleave", () => {
        if (!els.media.paused && !state.seeking) {
            window.clearTimeout(state.hideTimer);
            els.stage.classList.add("is-idle");
        }
    });

    els.controls.addEventListener("focusin", () => {
        window.clearTimeout(state.hideTimer);
        els.stage.classList.remove("is-idle");
    });

    els.controls.addEventListener("focusout", () => {
        if (!els.media.paused) scheduleHide();
    });

    els.controls.addEventListener("pointerenter", () => {
        window.clearTimeout(state.hideTimer);
        els.stage.classList.remove("is-idle");
    });

    els.controls.addEventListener("pointerleave", () => {
        if (!els.media.paused && !state.seeking) scheduleHide();
    });

    els.stage.addEventListener("click", (event) => {
        if (!state.currentId) return;
        if (event.target.closest(".controls, .empty, .dropzone")) return;
        if (els.stage.classList.contains("is-idle")) {
            showControls();
            return;
        }
        togglePlay();
    });

    /* ---------- Media events ---------- */

    els.media.addEventListener("loadedmetadata", () => {
        updateTimeline();
        updateBuffer();

        const track = getTrack();
        if (!track) return;

        let meta = formatBytes(track.file.size);
        if (track.kind === "video" && els.media.videoWidth) {
            meta = `${els.media.videoWidth}×${els.media.videoHeight} · ${meta}`;
        }
        els.badgeMeta.textContent = meta;

        if (els.media.paused) setNowLabel("Listo para reproducir");
    });

    els.media.addEventListener("durationchange", updateTimeline);
    els.media.addEventListener("progress", updateBuffer);

    els.media.addEventListener("timeupdate", () => {
        updateTimeline();
        updateMediaSessionPosition();
    });

    els.media.addEventListener("play", () => {
        if (!state.currentId) return;
        setNowLabel("Reproduciendo");
        els.stage.classList.remove("is-idle");
        syncPlayingUI();
    });

    els.media.addEventListener("pause", () => {
        if (!state.currentId) return;
        setNowLabel(els.media.ended ? "Finalizado" : "En pausa");
        syncPlayingUI();
    });

    els.media.addEventListener("ended", () => {
        if (!state.currentId) return;
        els.stage.classList.remove("is-playing");
        els.player.classList.remove("is-playing");
        setNowLabel("Finalizado");
        syncPlayingUI();

        if (state.loop) return;

        const index = state.tracks.findIndex((track) => track.id === state.currentId);
        const next = state.tracks[index + 1];
        if (next) {
            playTrack(next.id, true);
        }
    });

    els.media.addEventListener("waiting", () => {
        if (state.currentId) els.stage.classList.add("is-buffering");
    });

    ["playing", "canplay", "seeked"].forEach((eventName) => {
        els.media.addEventListener(eventName, () => els.stage.classList.remove("is-buffering"));
    });

    els.media.addEventListener("seeking", () => {
        if (!state.currentId) return;
        els.stage.classList.add("is-buffering");
    });

    els.media.addEventListener("volumechange", updateVolumeUI);

    els.media.addEventListener("ratechange", () => {
        const rate = els.media.playbackRate;
        markSpeedActive(rate);
    });

    els.media.addEventListener("error", () => {
        if (!state.currentId) return;
        els.stage.classList.remove("is-buffering", "is-playing");
        els.player.classList.remove("is-playing");
        setNowLabel("Error de reproducción");
        toast("No se pudo reproducir este archivo. Prueba con otro formato.", "error");
    });

    /* ---------- File input, drag & drop, buttons ---------- */

    [els.openBtn, els.emptyBtn].forEach((button) => {
        button.addEventListener("click", () => els.fileInput.click());
    });

    els.fileInput.addEventListener("change", () => addFiles(els.fileInput.files));

    els.clearBtn.addEventListener("click", clearAll);

    els.playBtn.addEventListener("click", togglePlay);
    els.backBtn.addEventListener("click", () => seekBy(-10));
    els.fwdBtn.addEventListener("click", () => seekBy(10));

    els.queueList.addEventListener("click", (event) => {
        const item = event.target.closest(".track");
        if (!item) return;
        const id = item.dataset.id;
        if (event.target.closest(".track__remove")) {
            removeTrack(id);
            return;
        }
        if (id === state.currentId) togglePlay();
        else playTrack(id, true);
    });

    function hasFiles(event) {
        return Boolean(event.dataTransfer) &&
            Array.from(event.dataTransfer.types || []).includes("Files");
    }

    window.addEventListener("dragenter", (event) => {
        if (!hasFiles(event)) return;
        event.preventDefault();
        state.dragDepth += 1;
        els.stage.classList.add("is-dragging");
    });

    window.addEventListener("dragover", (event) => {
        if (!hasFiles(event)) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = "copy";
    });

    window.addEventListener("dragleave", (event) => {
        if (event.relatedTarget === null) {
            state.dragDepth = 0;
            els.stage.classList.remove("is-dragging");
            return;
        }
        if (!event.dataTransfer) return;
        if (state.dragDepth > 0) {
            state.dragDepth -= 1;
            if (state.dragDepth === 0) els.stage.classList.remove("is-dragging");
        }
    });

    window.addEventListener("drop", (event) => {
        if (!hasFiles(event)) return;
        event.preventDefault();
        state.dragDepth = 0;
        els.stage.classList.remove("is-dragging");
        if (event.dataTransfer.files.length) addFiles(event.dataTransfer.files);
    });

    /* ---------- Media Session ---------- */

    function setMediaSession(track) {
        if (!("mediaSession" in navigator) || !("MediaMetadata" in window)) return;
        try {
            navigator.mediaSession.metadata = new MediaMetadata({
                title: prettyName(track.file.name),
                artist: "Code Player",
                album: track.kind === "audio" ? "Audio local" : "Video local"
            });
        } catch (error) {
            /* noop */
        }
    }

    function updateMediaSessionPosition() {
        if (!("mediaSession" in navigator)) return;
        const session = navigator.mediaSession;
        if (typeof session.setPositionState !== "function") return;

        const duration = els.media.duration;
        if (!Number.isFinite(duration) || duration <= 0) return;

        try {
            session.setPositionState({
                duration,
                playbackRate: els.media.playbackRate,
                position: Math.min(els.media.currentTime, duration)
            });
        } catch (error) {
            /* noop */
        }
    }

    function setupMediaSession() {
        if (!("mediaSession" in navigator)) return;
        const session = navigator.mediaSession;

        const safe = (action, handler) => {
            try {
                session.setActionHandler(action, handler);
            } catch (error) {
                /* acción no soportada */
            }
        };

        safe("play", () => {
            const attempt = els.media.play();
            if (attempt && typeof attempt.catch === "function") attempt.catch(() => {});
        });
        safe("pause", () => els.media.pause());
        safe("seekbackward", (details) => seekBy(-(details.seekOffset || 10)));
        safe("seekforward", (details) => seekBy(details.seekOffset || 10));
        safe("seekto", (details) => {
            if (Number.isFinite(details.seekTime)) els.media.currentTime = details.seekTime;
        });
        safe("previoustrack", () => playAdjacent(-1));
        safe("nexttrack", () => playAdjacent(1));
        safe("stop", () => {
            els.media.pause();
            resetPlayer();
        });
    }

    /* ---------- Keyboard ---------- */

    window.addEventListener("keydown", (event) => {
        const target = event.target;
        const tag = target && target.tagName;
        const isField = tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" ||
            (target && target.isContentEditable);

        if (isField) return;
        if (event.ctrlKey || event.metaKey || event.altKey) return;

        const key = event.key;
        const lower = key.toLowerCase();

        if (event.key === "Escape") {
            closeMenu();
            return;
        }

        if ((key === " " || key === "Enter") && target && target.closest("button")) {
            return;
        }

        if (key === " " || lower === "k") {
            event.preventDefault();
            if (state.currentId) togglePlay();
            else els.fileInput.click();
            return;
        }

        if (key === "ArrowLeft" || key === "ArrowRight") {
            if (!state.currentId) return;
            event.preventDefault();
            const step = event.shiftKey ? 10 : 5;
            seekBy(key === "ArrowLeft" ? -step : step);
            return;
        }

        if (key === "ArrowUp" || key === "ArrowDown") {
            if (!state.currentId) return;
            event.preventDefault();
            const step = event.shiftKey ? 0.1 : 0.05;
            setVolume((els.media.muted ? 0 : els.media.volume) + (key === "ArrowUp" ? step : -step));
            showControls();
            return;
        }

        if (lower === "m") {
            els.muteBtn.click();
            return;
        }

        if (lower === "f") {
            els.fsBtn.click();
            return;
        }

        if (lower === "l") {
            setLoop(!state.loop);
            showControls();
            return;
        }

        if (lower === "n") {
            playAdjacent(1);
            return;
        }

        if (lower === "p") {
            playAdjacent(-1);
        }
    });

    /* ---------- Init ---------- */

    els.media.volume = 1;
    els.media.loop = false;
    markSpeedActive(1);
    updateVolumeUI();
    updateTimeline();
    renderQueue();
    setupMediaSession();
    setLoop(false);

    if (!document.pictureInPictureEnabled) {
        els.pipBtn.hidden = true;
    }
})();
