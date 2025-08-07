class Globals {
    constructor() {
        if (Globals.instance) {
            return Globals.instance;
        }
        
        this.lastBungieFetch = null;
        this.bManifest = null;
        this.bManifestLock = false;
        this.commandBlacklist = ["ping", "ping.js"];
        
        Globals.instance = this;
    }

    setLastBungieFetch() {
        this.lastBungieFetch = new Date().toISOString();
    }

    getLastBungieFetch() {
        return this.lastBungieFetch;
    }

    setBManifest(data) {
        this.bManifest = data;
    }

    getBManifest() {
        return this.bManifest;
    }

    setBManifestLock(data) {
        this.bManifestLock = data;
    }

    getBManifestLock() {
        return this.bManifestLock;
    }

    getCommandBlacklist() {
        return this.commandBlacklist;
    }
}

const globals = new Globals();
//Object.freeze(globals);

module.exports = globals;