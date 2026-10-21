import type Phaser from 'phaser';
import { gameplaySize, gameTransform } from './viewport';
import { FullscreenSession } from './fullscreen';
type Orientation = ScreenOrientation & {
    lock?: (orientation: string) => Promise<void>;
    unlock?: () => void;
};
/** Keep FIT, changing logical size only while a coarse-pointer device is in battle. */
export class MobileViewport {
    private gameplay = false;
    private paused = false;
    private results = false;
    private frame = 0;
    private disposed = false;
    private cleanup: Array<() => void> = [];
    private lastBounds = '';
    private lastPortrait = false;
    private button = document.createElement('button');
    private notice = document.createElement('span');
    private session: FullscreenSession;
    private observer: ResizeObserver;
    readonly mobile = matchMedia('(pointer: coarse)').matches && navigator.maxTouchPoints > 0;
    constructor(private game: Phaser.Game) {
        const orientation = screen.orientation as Orientation | undefined;
        this.session = new FullscreenSession({ get supported() { return !!document.fullscreenEnabled && !!document.documentElement.requestFullscreen; }, get active() { return !!document.fullscreenElement; }, request: () => document.documentElement.requestFullscreen({ navigationUI: 'hide' }), exit: () => document.exitFullscreen(), lock: orientation?.lock ? () => orientation.lock!('landscape') : undefined, unlock: () => orientation?.unlock?.() }, message => { this.notice.textContent = message; });
        this.button.id = 'fullscreen-toggle';
        this.button.type = 'button';
        this.button.hidden = true;
        this.button.textContent = 'Enter fullscreen';
        this.button.setAttribute('aria-describedby', 'fullscreen-status');
        this.notice.id = 'fullscreen-status';
        this.notice.setAttribute('role', 'status');
        this.notice.hidden = true;
        document.body.append(this.button, this.notice);
        this.on(this.button, 'click', () => { this.cancel(true); this.notice.textContent = ''; void (document.fullscreenElement ? this.session.exit() : this.session.enter()).then(() => this.schedule()); });
        this.on(document, 'fullscreenchange', () => { this.session.changed(); this.cancel(true); this.schedule(); this.updateButton(); });
        this.on(window, 'resize', () => this.schedule());
        this.on(window, 'blur', () => this.cancel(true));
        this.on(document, 'visibilitychange', () => { if (document.hidden)
            this.cancel(true);
        else
            this.schedule(); });
        this.on(window.visualViewport, 'resize', () => this.schedule());
        this.on(window.visualViewport, 'scroll', () => this.schedule());
        this.on(orientation, 'change', () => { this.cancel(true); this.schedule(); });
        const pause = (v: boolean) => { this.paused = v; this.updateButton(); };
        game.events.on('pause-visual', pause);
        const results = (v:boolean) => {this.results=v;this.updateButton();};
        game.events.on('results-visual',results);
        this.cleanup.push(()=>game.events.off('results-visual',results));
        this.cleanup.push(() => game.events.off('pause-visual', pause));
        this.observer = new ResizeObserver(() => this.schedule());
        this.observer.observe(document.getElementById('game')!);
        game.events.once('destroy', () => this.destroy());
    }
    private on(target: EventTarget | null | undefined, event: string, fn: () => void) { target?.addEventListener(event, fn); this.cleanup.push(() => target?.removeEventListener(event, fn)); }
    enterGameplay() { this.results=false; this.gameplay = true; this.paused = false; document.body.classList.toggle('mobile-gameplay', this.mobile); this.refresh(); this.updateButton(); }
    leaveGameplay() { this.results=false; this.cancel(false); this.gameplay = false; this.paused = false; document.body.classList.remove('mobile-gameplay'); this.lastBounds = ''; void this.session.exit(); this.refresh(); this.updateButton(); }
    private updateButton() { const visible = this.mobile && this.gameplay && this.paused && !this.results; this.button.hidden = !visible; this.notice.hidden = !visible; this.button.textContent = document.fullscreenElement ? 'Exit fullscreen' : 'Enter fullscreen'; }
    private cancel(pause: boolean) { if (!this.gameplay)
        return; this.game.events.emit('clear-controls'); for (const scene of this.game.scene.getScenes(true))
        scene.input?.resetPointers(); if (pause)
        this.game.events.emit('request-pause'); }
    private schedule() { if (!this.frame && !this.disposed)
        this.frame = requestAnimationFrame(() => { this.frame = 0; this.refresh(); }); }
    private refresh() {
        if (!this.game.isBooted || this.disposed)
            return;
        const v = window.visualViewport, style = document.body.style;
        for (const [key, value] of Object.entries({ width: v?.width ?? innerWidth, height: v?.height ?? innerHeight, left: v?.offsetLeft ?? 0, top: v?.offsetTop ?? 0 }))
            style.setProperty('--viewport-' + key, value + 'px');
        const parent = document.getElementById('game')!, r = parent.getBoundingClientRect(), mobile = this.mobile && this.gameplay, portrait = r.height > r.width;
        const signature = [r.x, r.y, r.width, r.height, mobile].join(':');
        if (signature === this.lastBounds)
            return;
        this.cancel(this.gameplay && portrait !== this.lastPortrait);
        this.lastPortrait = portrait;
        this.lastBounds = signature;
        const size = gameplaySize(r.width, r.height, mobile && !portrait);
        this.button.style.left = (r.left + 4) + 'px';
        this.button.style.top = (r.top + 8) + 'px';
        this.button.style.bottom = 'auto';
        this.notice.style.left = (r.left + 4) + 'px';
        this.notice.style.top = (r.top + 60) + 'px';
        this.notice.style.bottom = 'auto';
        this.game.scale.getParentBounds();
        if (Math.abs(this.game.scale.width - size.width) > .001 || this.game.scale.height !== size.height)
            this.game.scale.setGameSize(size.width, size.height);
        else
            this.game.scale.refresh();
    }
    transform() { return gameTransform(this.game); }
    destroy() { this.disposed = true; cancelAnimationFrame(this.frame); this.observer.disconnect(); this.cleanup.splice(0).forEach(fn => fn()); void this.session.exit(); this.button.remove(); this.notice.remove(); document.body.classList.remove('mobile-gameplay'); }
}
declare global {
    interface Window {
        kingdomViewport: MobileViewport;
    }
}
