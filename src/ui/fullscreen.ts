export interface FullscreenHost {
    readonly supported: boolean;
    readonly active: boolean;
    request: () => Promise<void>;
    exit: () => Promise<void>;
    lock?: () => Promise<void>;
    unlock?: () => void;
}
/** Rejections are normal capability outcomes, never global prototype errors. */
export class FullscreenSession {
    private revision = 0;
    private entering = false;
    constructor(private host: FullscreenHost, private status: (message: string) => void) { }
    async enter() {
        if (!this.host.supported) {
            this.status('Fullscreen unavailable. Continue in browser.');
            return false;
        }
        if (this.entering)
            return false;
        this.entering = true;
        const revision = ++this.revision;
        try {
            await this.host.request();
            if (revision !== this.revision) {
                await this.exit();
                return false;
            }
            if (!this.host.active)
                return false;
            if (this.host.lock) {
                try {
                    await this.host.lock();
                }
                catch {
                    this.status('Rotate to landscape if needed.');
                }
            }
            if (revision !== this.revision || !this.host.active) {
                this.unlock();
                return false;
            }
            return true;
        }
        catch {
            this.status('Fullscreen unavailable. Continue in browser.');
            return false;
        }
        finally {
            this.entering = false;
        }
    }
    unlock() { try {
        this.host.unlock?.();
    }
    catch { /* No active orientation lock to release. */ } }
    changed() { if (!this.host.active) {
        this.revision++;
        this.unlock();
    } }
    async exit() {
        this.revision++;
        this.unlock();
        if (this.host.active) {
            try {
                await this.host.exit();
            }
            catch {
                this.status('Use the browser fullscreen exit control.');
            }
        }
    }
}
