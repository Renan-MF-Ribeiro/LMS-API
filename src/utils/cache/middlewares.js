const { log } = require("../logger");

const { defaultCacheUnit, getCacheTTLmsFromUnit } = require("./helpers");
const { getFromCache, setInCache } = require('./store');

const environment = require("../../environment");

/**
 * Sets HTTP cache headers on the response object to enable client-side caching.
 * 
 * @param {Object} res - The HTTP response object
 * @param {number} ttl - Time to live in milliseconds for the cache
 * @description Removes any existing Surrogate-Control header and sets Cache-Control,
 * Expires, and Pragma headers to configure caching behavior. The Cache-Control
 * max-age is set in seconds (ttl/1000) and Expires header is set to current time plus ttl.
 */
function setResponseCacheHeaders(res, ttl) {
    log('[CACHE] Setting client cache headers');
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
 * @param {number} [cacheUnit] - How many cache units to use for the TTL (default is 15)
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
function cacheRequestOnStore(cacheUnit = defaultCacheUnit, cacheOnClient = false) {
    return async (req, res, next) => {
        if (!environment.CACHE_ENABLED) {
            log('[CACHE][cacheRequestOnStore] Caching is disabled');
            return next();
        }

        if (res.statusCode >= 400) return next();

        const originalSend = res.send;
        const ttl = getCacheTTLmsFromUnit(cacheUnit);

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
                cacheUnit
            );
            originalSend.call(res, body);
        };

        next();
    }
}

/**
 * Creates an Express middleware function that sets HTTP cache headers for client-side caching.
 * 
 * @param {number} [cacheUnit=defaultCacheUnit] - How many cache units to use for the TTL (default is 15)
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
function cacheRequestOnClient(cacheUnit = defaultCacheUnit) {
    return (req, res, next) => {
        if (!environment.CACHE_ENABLED) {
            log('[CACHE][cacheRequestOnClient] Caching is disabled');
            return next();
        }
        
        if (res.statusCode >= 400) return next();

        const originalSend = res.send;
        const ttl = getCacheTTLmsFromUnit(cacheUnit);

        res.send = function (body) {
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
function cacheRequest(cacheUnitStore = defaultCacheUnit, cacheUnitClient = defaultCacheUnit) {
    const middlewares = [];

    if (cacheUnitStore > 0) middlewares.push(cacheRequestOnStore(cacheUnitStore, cacheUnitClient > 0 ? true : false));

    if (cacheUnitClient > 0) middlewares.push(cacheRequestOnClient(cacheUnitClient));

    return middlewares;
}

module.exports = {
    cacheRequestOnStore,
    cacheRequestOnClient,
    cacheRequest,
}