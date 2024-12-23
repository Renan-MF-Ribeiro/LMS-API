const express = require('express');
const { getUserByToken } = require('../../utils/functions');
const { validateTokenRoute, isAdminOrAccountant } = require('../../utils/middlewares');
const { getTagsElegiblesByToken } = require('../sections/business');
const ApiError = require('../../errors/ApiError');
const {
    gamificationShopClient,
    getDynamicRequestProps,
    handleShopRequest,
    jsonOrFormData,
    parseProductBodyAndUploadImages,
    parseCategoryBodyAndUploadImages,
} = require('./business');

const userRouter = express.Router();

const adminRouter = express.Router();

// USER
userRouter
    // CATEGORIES
    .get('/categories', async (req, res) => {
        handleShopRequest(
            gamificationShopClient.get('/categories', getDynamicRequestProps(req)),
            res
        )
    })
    .get('/categories/:categoryId/products', async (req, res) => {
        handleShopRequest(
            gamificationShopClient.get(
                `/categories/${req.params.categoryId}/products`,
                getDynamicRequestProps(req)
            ),
            res
        );
    })

    // PRODUCTS
    .get('/products', async (req, res) => {
        handleShopRequest(
            gamificationShopClient.get('/products', getDynamicRequestProps(req)),
            res
        );
    })

    // CART
    .get('/cart', async (req, res) => {
        handleShopRequest(
            gamificationShopClient.get('/cart', getDynamicRequestProps(req)),
            res
        );
    })
    .post('/cart', async (req, res) => {
        handleShopRequest(
            gamificationShopClient.post(
                `/cart`,
                req.body,
                getDynamicRequestProps(req)
            ),
            res
        );
    })
    .delete('/cart/items/:itemId', async (req, res) => {
        const { itemId } = req.params;

        handleShopRequest(
            gamificationShopClient.delete(
                `/cart/items/${itemId}`,
                getDynamicRequestProps(req)
            ),
            res
        );
    })
    .post('/cart/checkout', async (req, res) => {
        const { owner, ...config } = getDynamicRequestProps(req);
        handleShopRequest(
            gamificationShopClient.post(
                `/cart/checkout`,
                { owner },
                config,
            ),
            res
        );
    })

    // ORDERS
    .get('/orders', async (req, res) => {
        handleShopRequest(
            gamificationShopClient.get('/orders', getDynamicRequestProps(req)),
            res
        );
    })
    .get('/orders/pending', async (req, res) => {
        handleShopRequest(
            gamificationShopClient.get('/orders/pending', getDynamicRequestProps(req)),
            res
        );
    });

// ADMIN
adminRouter
    // PRODUCTS
    .get('/products', async (req, res) => {
        handleShopRequest(
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
            return handleShopRequest(
                gamificationShopClient.post(
                    '/admin/products',
                    { ...req.body, owner },
                    config
                ),
                res
            );
        }

        return handleShopRequest(
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
            return handleShopRequest(
                gamificationShopClient.put(
                    `/admin/products/${productId}`,
                    { ...req.body, owner },
                    config
                ),
                res
            );
        }

        return handleShopRequest(
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

        handleShopRequest(
            gamificationShopClient.delete(
                `/admin/products/${productId}`,
                getDynamicRequestProps(req)
            ),
            res
        );
    })
    .get('/products/:productId/orders', async (req, res) => {
        const { productId } = req.params;

        handleShopRequest(
            gamificationShopClient.get(
                `/admin/products/${productId}/orders`,
                getDynamicRequestProps(req)
            ),
            res
        );
    })
    .post('/products/:productId/stock', async (req, res) => {
        const { productId } = req.params;

        handleShopRequest(
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

        handleShopRequest(
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
        handleShopRequest(
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
            return handleShopRequest(
                gamificationShopClient.post(
                    '/admin/categories',
                    { ...req.body, owner },
                    config
                ),
                res
            );
        }

        return handleShopRequest(
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
            return handleShopRequest(
                gamificationShopClient.put(
                    `/admin/categories/${categoryId}`,
                    { ...req.body, owner },
                    config
                ),
                res
            );
        }

        return handleShopRequest(
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

        handleShopRequest(
            gamificationShopClient.delete(
                `/admin/categories/${categoryId}`,
                getDynamicRequestProps(req)
            ),
            res
        );
    })
    .post('/categories/indexes', jsonOrFormData, async (req, res) => {
        return handleShopRequest(
            gamificationShopClient.post(
                '/admin/categories/indexes',
                req.body,
                ...getDynamicRequestProps(req),
            ),
            res
        );
    })

    // ORDERS
    .get('/orders', async (req, res) => {
        handleShopRequest(
            gamificationShopClient.get('/admin/orders', getDynamicRequestProps(req)),
            res
        );
    })
    .patch('/orders/:orderId/status', async (req, res) => {
        const { orderId } = req.params;

        const { owner, ...config } = getDynamicRequestProps(req);

        handleShopRequest(
            gamificationShopClient.patch(
                `/admin/orders/${orderId}/status`,
                { ...req.body, owner },
                config
            ),
            res
        );
    });

const shopRouter = express.Router();

shopRouter.use(async (req, res, next) => {
    req.user = await getUserByToken(req);

    req.eligibilities = (await getTagsElegiblesByToken(req)).concat(req.user?.groupsAD)
        ?.map(tag => tag.value ?? tag);

    if (!req.user) {
        throw new ApiError('Unauthorized', 401);
    }

    next();
});

shopRouter.use(validateTokenRoute);

shopRouter.use('/', userRouter);

shopRouter.use('/admin', isAdminOrAccountant, adminRouter);

module.exports = shopRouter;
