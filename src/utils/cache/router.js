const express = require('express');
const { isSuperAdmin } = require('../middlewares');
const { getCacheEntries, removeFromCache, getFromCache, clearCache } = require('./store');

function getCacheKeyFromURL(url) {
    return url.replace(/^((\/?)cache\/(remove|value))/g, '').split('?')[0];
}

const cacheRouter = express.Router();

cacheRouter.use((req, res, next) => {
    const token = req.query?.token || req.headers?.authorization;

    if (!token) {
        return res.status(401).send('invalid or missing token');
    }

    req.headers.authorization = token;

    return isSuperAdmin(req, res, next);
});

cacheRouter.get('/cache/info', (req, res) => {
    res.json({
        host: process.env.HOSTNAME || 'unknown',
        totalSize: (getCacheEntries().reduce((acc, entry) => acc + entry.valueSize, 0) / (1024 * 1024)).toFixed(2) + ' MB',
        cacheEntries: getCacheEntries(),
    });
});

cacheRouter.get('/cache/remove/*', (req, res) => {
    const key = getCacheKeyFromURL(req.originalUrl);
    removeFromCache(key, true);

    res.send(`Cache entries for key "${key}" removed`);
});

cacheRouter.get('/cache/value/*', (req, res) => {
    const key = getCacheKeyFromURL(req.originalUrl);
    const value = getFromCache(key);

    if (value) {
        res.json({ key, value });
    } else {
        res.status(404).send('Cache entry not found');
    }
});

cacheRouter.get('/cache/clear', (req, res) => {
    clearCache();

    res.send('Cache cleared');
});

module.exports = {
    cacheRouter,
};