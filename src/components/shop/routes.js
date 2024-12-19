const express = require('express');
const { getUserByToken } = require('../../utils/functions');
const { validateTokenRoute, isAdminOrAccountant } = require('../../utils/middlewares');
const axios = require('axios');
const { isSegmentationException } = require('../config/business');
const { getTagsElegiblesByToken } = require('../sections/business');
const formidable = require('express-formidable');
const { azureBlob } = require('../../utils/files');

const gamificationShopClient = axios.create({
    baseURL: `${process.env.API_GAMIFICATION}/shop`,
    headers: {
        'x-api-key': process.env.API_KEY_GAMIFICATION,
        'x-client-id': process.env.CLIENT_ID
    },
});

function getDynamicRequestProps(req) {
    const ownerFieldValue = !isSegmentationException(req.user, req.segmentation)
        ? (req.user?.[req.segmentation?.rule?.issuer] ?? null)
        : undefined;

    return {
        owner: ownerFieldValue ? [ownerFieldValue] : undefined,
        headers: {
            'x-user-id': req.user.networkLogin
        },
        params: {
            ...req.query,
            owner: ownerFieldValue ? [ownerFieldValue] : undefined,
            eligibilities: req.eligibilities ?? [],
        },
    };
}

function handleRequest(promise, res) {
    promise
        .then(({ data, status }) => res.status(status).json(data))
        .catch(({ response }) => res.status(response?.status ?? 500).json(response?.data ?? { error: 'Internal Server Error' }));
}

function jsonOrFormData(req, res, next) {
    if (req.is('json')) return next();
    return formidable({ multiples: true })(req, res, next);
};

async function parseProductBodyAndUploadImages(req) {
    const reqFields = req.fields?.payload;

    if (!reqFields) throw new Error('Invalid request');

    const reqFiles = Object.entries(req.files ?? []).map(([, file]) => file);

    const body = JSON.parse(reqFields);

    if (body.image) {
        const file = reqFiles.find(image => image.name === body.image);

        if (file) {
            body.image = await azureBlob(file, 'shop/products') ?? null;
        }
    }

    return body;
}

async function parseCategoryBodyAndUploadImages(req) {
    const reqFields = req.fields?.payload;

    if (!reqFields) throw new Error('Invalid request');

    const reqFiles = Object.entries(req.files ?? []).map(([, file]) => file);

    const body = JSON.parse(reqFields);

    if (body.thumb) {
        const file = reqFiles.find(image => image.name === body.thumb);

        if (file) {
            body.thumb = await azureBlob(file, 'shop/categories/thumbs') ?? null;
        }
    }

    if (body.banner) {
        const file = reqFiles.find(image => image.name === body.banner);

        if (file) {
            body.banner = await azureBlob(file, 'shop/categories/banners') ?? null;
        }
    }

    return body;
}

const userRouter = express.Router();

const adminRouter = express.Router();

userRouter
    // USER
    // CATEGORIES
    .get('/categories', async (req, res) => {
        handleRequest(
            gamificationShopClient.get('/categories', getDynamicRequestProps(req)),
            res
        )
    })
    .get('/categories/:categoryId/products', async (req, res) => {
        handleRequest(
            gamificationShopClient.get(
                `/categories/${req.params.categoryId}/products`,
                getDynamicRequestProps(req)
            ),
            res
        );
    })

    // PRODUCTS
    .get('/products', async (req, res) => {
        handleRequest(
            gamificationShopClient.get('/products', getDynamicRequestProps(req)),
            res
        );
    })

    // CART
    .get('/cart', async (req, res) => {
        handleRequest(
            gamificationShopClient.get('/cart', getDynamicRequestProps(req)),
            res
        );
    })
    .post('/cart', async (req, res) => {
        const { item, quantity } = req.body;

        handleRequest(
            gamificationShopClient.post(
                `/cart`,
                { item, quantity },
                getDynamicRequestProps(req)
            ),
            res
        );
    })
    .delete('/cart/items/:itemId', async (req, res) => {
        const { itemId } = req.params;

        handleRequest(
            gamificationShopClient.delete(
                `/cart/items/${itemId}`,
                getDynamicRequestProps(req)
            ),
            res
        );
    })
    .post('/cart/checkout', async (req, res) => {
        handleRequest(
            gamificationShopClient.post(
                `/cart/checkout`,
                {},
                getDynamicRequestProps(req)
            ),
            res
        );
    })

    // ORDERS
    .get('/orders', async (req, res) => {
        handleRequest(
            gamificationShopClient.get('/orders', getDynamicRequestProps(req)),
            res
        );
    })
    .get('/orders/pending', async (req, res) => {
        handleRequest(
            gamificationShopClient.get('/orders/pending', getDynamicRequestProps(req)),
            res
        );
    });

// ADMIN
adminRouter
    // PRODUCTS
    .get('/products', async (req, res) => {
        handleRequest(
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
            return handleRequest(
                gamificationShopClient.post(
                    '/admin/products',
                    { ...req.body, owner },
                    config
                ),
                res
            );
        }

        return handleRequest(
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
            return handleRequest(
                gamificationShopClient.put(
                    `/admin/products/${productId}`,
                    { ...req.body, owner },
                    config
                ),
                res
            );
        }

        return handleRequest(
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

        handleRequest(
            gamificationShopClient.delete(
                `/admin/products/${productId}`,
                getDynamicRequestProps(req)
            ),
            res
        );
    })
    .get('/products/:productId/orders', async (req, res) => {
        const { productId } = req.params;

        handleRequest(
            gamificationShopClient.get(
                `/admin/products/${productId}/orders`,
                getDynamicRequestProps(req)
            ),
            res
        );
    })
    .post('/products/:productId/stock', async (req, res) => {
        const { productId } = req.params;

        handleRequest(
            gamificationShopClient.post(
                `/admin/products/${productId}/stock`,
                req.body,
                getDynamicRequestProps(req)
            ),
            res
        )
    })

    // CATEGORIES
    .get('/categories', async (req, res) => {
        handleRequest(
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
            return handleRequest(
                gamificationShopClient.post(
                    '/admin/categories',
                    { ...req.body, owner },
                    config
                ),
                res
            );
        }

        return handleRequest(
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
            return handleRequest(
                gamificationShopClient.put(
                    `/admin/categories/${categoryId}`,
                    { ...req.body, owner },
                    config
                ),
                res
            );
        }

        return handleRequest(
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

        handleRequest(
            gamificationShopClient.delete(
                `/admin/categories/${categoryId}`,
                getDynamicRequestProps(req)
            ),
            res
        );
    })

    // ORDERS
    .get('/orders', async (req, res) => {
        handleRequest(
            gamificationShopClient.get('/admin/orders', getDynamicRequestProps(req)),
            res
        );
    })
    .patch('/orders/:orderId/status', async (req, res) => {
        const { orderId } = req.params;

        const { owner, ...config } = getDynamicRequestProps(req);

        handleRequest(
            gamificationShopClient.patch(
                `/admin/orders/${orderId}`,
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
