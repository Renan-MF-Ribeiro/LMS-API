const express = require('express');

const ApiError = require('../../../errors/ApiError');

const gamificationShopClient = require('../clients/gamificationShop');

const {
    getDynamicRequestProps,
    handleShopRequest,
    jsonOrFormData,
    parseProductBodyAndUploadImages,
    parseCategoryBodyAndUploadImages,
} = require('../business');

const adminRouter = express.Router();

// ADMIN
adminRouter
    // PRODUCTS
    .get('/products', async (req, res) => {
        await handleShopRequest(
            gamificationShopClient.get(
                '/admin/products',
                getDynamicRequestProps(req)
            ),
            res
        );
    })
    .post('/products', jsonOrFormData, async (req, res) => {
        const { owner, ...config } = getDynamicRequestProps(req)

        if (req.is('json')) {
            return await handleShopRequest(
                gamificationShopClient.post(
                    '/admin/products',
                    { ...req.body, owner },
                    config
                ),
                res
            );
        }

        await handleShopRequest(
            gamificationShopClient.post(
                '/admin/products',
                { ...(await parseProductBodyAndUploadImages(req)), owner },
                getDynamicRequestProps(req)
            ),
            res
        );
    })
    .put('/products/:productId', jsonOrFormData, async (req, res) => {
        const { productId } = req.params;

        const { owner, ...config } = getDynamicRequestProps(req)

        if (req.is('json')) {
            return await handleShopRequest(
                gamificationShopClient.put(
                    `/admin/products/${productId}`,
                    { ...req.body, owner },
                    config
                ),
                res
            );
        }

        await handleShopRequest(
            gamificationShopClient.put(
                `/admin/products/${productId}`,
                { ...(await parseProductBodyAndUploadImages(req)), owner },
                getDynamicRequestProps(req)
            ),
            res
        );

    })
    .delete('/products/:productId', async (req, res) => {
        const { productId } = req.params;

        await handleShopRequest(
            gamificationShopClient.delete(
                `/admin/products/${productId}`,
                getDynamicRequestProps(req)
            ),
            res
        );
    })
    .get('/products/:productId/orders', async (req, res) => {
        const { productId } = req.params;

        await handleShopRequest(
            gamificationShopClient.get(
                `/admin/products/${productId}/orders`,
                getDynamicRequestProps(req)
            ),
            res
        );
    })
    .post('/products/:productId/stock', async (req, res) => {
        const { productId } = req.params;

        await handleShopRequest(
            gamificationShopClient.post(
                `/admin/products/${productId}/stock`,
                req.body,
                getDynamicRequestProps(req)
            ),
            res
        )
    })
    .patch('/products/:productId/:status', async (req, res) => {
        const { productId, status } = req.params;

        if (!['active', 'inactive'].includes(status)) {
            throw new ApiError('Invalid status', 400);
        }

        await handleShopRequest(
            gamificationShopClient.patch(
                `/admin/products/${productId}/${status}`,
                {},
                getDynamicRequestProps(req)
            ),
            res
        )
    })

    // CATEGORIES
    .get('/categories', async (req, res) => {
        await handleShopRequest(
            gamificationShopClient.get(
                '/admin/categories',
                getDynamicRequestProps(req)
            ),
            res
        );
    })
    .post('/categories', jsonOrFormData, async (req, res) => {
        const { owner, ...config } = getDynamicRequestProps(req)

        if (req.is('json')) {
            return await handleShopRequest(
                gamificationShopClient.post(
                    '/admin/categories',
                    { ...req.body, owner },
                    config
                ),
                res
            );
        }

        await handleShopRequest(
            gamificationShopClient.post(
                '/admin/categories',
                { ...(await parseCategoryBodyAndUploadImages(req)), owner },
                config
            ),
            res
        );
    })
    .put('/categories/:categoryId', jsonOrFormData, async (req, res) => {
        const { categoryId } = req.params;

        const { owner, ...config } = getDynamicRequestProps(req)

        if (req.is('json')) {
            return await handleShopRequest(
                gamificationShopClient.put(
                    `/admin/categories/${categoryId}`,
                    { ...req.body, owner },
                    config
                ),
                res
            );
        }

        await handleShopRequest(
            gamificationShopClient.put(
                `/admin/categories/${categoryId}`,
                { ...(await parseCategoryBodyAndUploadImages(req)), owner },
                config
            ),
            res
        );
    })
    .delete('/categories/:categoryId', async (req, res) => {
        const { categoryId } = req.params;

        await handleShopRequest(
            gamificationShopClient.delete(
                `/admin/categories/${categoryId}`,
                getDynamicRequestProps(req)
            ),
            res
        );
    })
    .post('/categories/indexes', async (req, res) => {
        await handleShopRequest(
            gamificationShopClient.post(
                '/admin/categories/indexes',
                req.body,
                getDynamicRequestProps(req),
            ),
            res
        );
    })

    // ORDERS
    .get('/orders', async (req, res) => {
        await handleShopRequest(
            gamificationShopClient.get('/admin/orders', getDynamicRequestProps(req)),
            res
        );
    })
    .patch('/orders/:orderId/status', async (req, res) => {
        const { orderId } = req.params;

        const { owner, ...config } = getDynamicRequestProps(req);

        await handleShopRequest(
            gamificationShopClient.patch(
                `/admin/orders/${orderId}/status`,
                { ...req.body, owner },
                config
            ),
            res
        );
    });

module.exports = adminRouter;
