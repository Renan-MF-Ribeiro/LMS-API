const express = require('express');
const { getUserByToken } = require('../../utils/functions');
const { validateTokenRoute, isAdminOrAccountant } = require('../../utils/middlewares');
const axios = require('axios');
const { isSegmentationException } = require('../config/business');

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
        headers: {
            'x-user-id': req.user.networkLogin
        },
        params: {
            ...req.query,
            owner: ownerFieldValue ? [ownerFieldValue] : undefined,
            eligibilities: req.user?.groupsAD ?? [],
        },
    };
}

function handleRequest(promise, res) {
    promise
        .then(({ data, status }) => res.status(status).json(data))
        .catch(({ response }) => res.status(response?.status ?? 500).json(response?.data ?? { error: 'Internal Server Error' }));
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
    .post('/carts/:cartId?', async (req, res) => {
        const { cartId } = req.params;

        const { item, quantity } = req.body;

        handleRequest(
            gamificationShopClient.post(
                `/carts/${cartId || ''}`,
                { item, quantity },
                getDynamicRequestProps(req)
            ),
            res
        );
    })
    .delete('/carts/:cartId/items/:itemId', async (req, res) => {
        const { cartId, itemId } = req.params;

        handleRequest(
            gamificationShopClient.delete(
                `/carts/${cartId}/items/${itemId}`,
                getDynamicRequestProps(req)
            ),
            res
        );
    })
    .post('/carts/:cartId/checkout', async (req, res) => {
        const { cartId } = req.params;

        handleRequest(
            gamificationShopClient.post(
                `/carts/${cartId}/checkout`,
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
    .post('/products', async (req, res) => {
        handleRequest(
            gamificationShopClient.post(
                '/admin/products',
                req.body,
                getDynamicRequestProps(req)
            ),
            res
        );
    })
    .put('/products/:productId', async (req, res) => {
        const { productId } = req.params;

        handleRequest(
            gamificationShopClient.put(
                `/admin/products/${productId}`,
                req.body,
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
    .post('/categories', async (req, res) => {
        handleRequest(
            gamificationShopClient.post(
                '/admin/categories',
                req.body,
                getDynamicRequestProps(req)
            ),
            res
        );
    })
    .put('/categories/:categoryId', async (req, res) => {
        const { categoryId } = req.params;

        handleRequest(
            gamificationShopClient.put(
                `/admin/categories/${categoryId}`,
                req.body,
                getDynamicRequestProps(req)
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
    .patch('/orders/:orderId/:status', async (req, res) => {
        const { orderId, status } = req.params;

        handleRequest(
            gamificationShopClient.patch(
                `/admin/orders/${orderId}/${status}`,
                getDynamicRequestProps(req)
            ),
            res
        );
    });

const shopRouter = express.Router();

shopRouter.use(async (req, res, next) => {
    req.user = await getUserByToken(req);

    if (!req.user) {
        throw new ApiError('Unauthorized', 401);
    }

    next();
});

shopRouter.use(validateTokenRoute);

shopRouter.use('/', userRouter);

shopRouter.use('/admin', isAdminOrAccountant, adminRouter);

module.exports = shopRouter;
