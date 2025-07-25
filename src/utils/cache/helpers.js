const { log } = require("../logger");

const { getFromCache, setInCache } = require('./store');

const defaultCacheTtl = 15 * 60 * 1000; // 15 minutes

function setResponseCacheHeaders(res, ttl) {
    res.removeHeader('Surrogate-Control');
    res.setHeader('Cache-Control', `public, max-age=${ttl / 1000}`);
    res.setHeader('Expires', new Date(Date.now() + ttl).toUTCString());
    res.setHeader('Pragma', 'cache');
}

/**
 * Creates an Express middleware that caches HTTP responses in a store.
 * 
 * This middleware intercepts outgoing responses and stores them in cache using the request URL as the key.
 * If a cached response exists for the same URL, it returns the cached response instead of processing the request.
 * 
 * @param {number} [ttl=cacheTtl] - Time to live for the cached response in the cache store
 * @param {boolean} [cacheOnClient=false] - Whether to set client-side cache headers
 * @returns {Function} Express middleware function that handles request caching
 * 
 * @example
 * // Use with default TTL
 * app.get('/api/data', cacheRequestOnStore(), controller.getData);
 * 
 * // Use with custom TTL (in seconds)
 * app.get('/api/data', cacheRequestOnStore(3600), controller.getData);
 */
function cacheRequestOnStore(ttl = defaultCacheTtl, cacheOnClient = false) {
    return async (req, res, next) => {
        if (res.statusCode >= 400) return next();

        const originalSend = res.send;

        let cacheKey = req.originalUrl;

        const cachedResponse = getFromCache(cacheKey);

        if (cachedResponse) {
            // add headers from cached response
            if (cachedResponse.headers['Content-Type']) {
                res.setHeader('Content-Type', cachedResponse.headers['Content-Type']);
            }

            if (cachedResponse.headers['Content-Length']) {
                res.setHeader('Content-Length', cachedResponse.headers['Content-Length']);
            }

            if (cacheOnClient) {
                setResponseCacheHeaders(res, ttl);
            }

            return res
                .status(cachedResponse.statusCode || 200)
                .send(cachedResponse.body);
        }

        res.send = function (body) {
            setInCache(
                cacheKey,
                {
                    statusCode: res.statusCode,
                    body,
                    headers: {
                        'Content-Type': res.getHeader('Content-Type'),
                        'Content-Length': res.getHeader('Content-Length')
                    }
                },
                ttl
            );
            originalSend.call(res, body);
        };

        next();
    }
}

/**
 * Creates an Express middleware function that sets HTTP cache headers for client-side caching.
 * 
 * @param {number} [ttl=cacheTtl] - Time to live in milliseconds for the cache
 * @returns {Function} Express middleware function that sets cache headers
 * 
 * @description This middleware removes the 'Surrogate-Control' header and sets appropriate
 * cache headers including 'Cache-Control', 'Expires', and 'Pragma' to enable client-side caching.
 * The Cache-Control max-age is set in seconds while the TTL parameter is expected in milliseconds.
 * 
 * @example
 * // Use with default TTL
 * app.get('/api/data', cacheRequestOnClient(), (req, res) => {
 *   res.json({ data: 'cached data' });
 * });
 * 
 * @example
 * // Use with custom TTL (1 hour)
 * app.get('/api/data', cacheRequestOnClient(3600000), (req, res) => {
 *   res.json({ data: 'cached data' });
 * });
 */
function cacheRequestOnClient(ttl = defaultCacheTtl) {
    return (req, res, next) => {
        if (res.statusCode >= 400) return next();

        const originalSend = res.send;

        res.send = function (body) {
            log('[CACHE] Setting client cache headers', req.originalUrl);

            setResponseCacheHeaders(res, ttl);

            originalSend.call(res, body);
        };

        next();
    };
}

/**
 * Creates an array of cache middleware functions for both store and client caching.
 * 
 * @param {number} [ttlStore=cacheTtl] - Time-to-live in seconds for store cache
 * @param {number} [ttlClient=cacheTtl] - Time-to-live in seconds for client cache
 * @returns {Array} An array containing store cache middleware and client cache middleware functions
 */
function cacheRequest(ttlStore = defaultCacheTtl, ttlClient = defaultCacheTtl) {
    const middlewares = [];

    if (ttlStore > 0) middlewares.push(cacheRequestOnStore(ttlStore, ttlClient > 0 ? true : false));

    if (ttlClient > 0) middlewares.push(cacheRequestOnClient(ttlClient));

    return middlewares;
}

module.exports = {
    cacheRequestOnStore,
    cacheRequestOnClient,
    cacheRequest,
    defaultCacheTtl,
}