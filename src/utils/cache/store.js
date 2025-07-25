const { log } = require("../logger");

const defaultCacheTtl = 15 * 60 * 1000; // 15 minutes

const cacheStore = new Map();

function setInCache(key, value, ttl = defaultCacheTtl) {
    log('[CACHE] Setting store', key);

    cacheStore.set(key, {
        value,
        ttl,
        timestamp: Date.now(),
        expires: Date.now() + ttl
    });

    return value;
}

function getFromCache(key) {
    const cached = cacheStore.get(key);

    if (cached) {
        if (Date.now() > cached.expires) {
            log('[CACHE] Key expired', key);
            cacheStore.delete(key);
            return null;
        }

        log('[CACHE] Returning from cache', key);

        return cached.value;
    }

    return null;
}

function removeFromCache(key, matchKeys = false) {
    if (matchKeys) {
        for (const [cacheKey] of cacheStore) {
            if (cacheKey.startsWith(key)) {
                cacheStore.delete(cacheKey);
            }
        }

        return;
    }

    cacheStore.delete(key);
}

function clearCache() {
    cacheStore.clear();
}

function getCacheEntries() {
    const entries = Array.from(cacheStore.entries()).map(([key, { value, timestamp, expires }]) => ({
        key,
        valueSize: Buffer.byteLength(JSON.stringify(value), 'utf8'),
        timestamp: new Date(timestamp).toISOString(),
        expires: new Date(expires).toISOString(),
    }));

    return entries;
}

module.exports = {
    setInCache,
    getFromCache,
    removeFromCache,
    clearCache,
    getCacheEntries,
    defaultCacheTtl
};