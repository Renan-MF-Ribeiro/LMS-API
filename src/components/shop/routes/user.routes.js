const express = require('express');

const {
    getDynamicRequestProps,
    handleShopRequest,
} = require('../business');

const gamificationShopClient = require('../clients/gamificationShop');

const userRouter = express.Router();

// USER
userRouter
    // CATEGORIES
    .get('/categories', async (req, res) => {
        await handleShopRequest(
            gamificationShopClient.get('/categories', getDynamicRequestProps(req)),
            res
        )
    })
    .get('/categories/:categoryId/products', async (req, res) => {
        await handleShopRequest(
            gamificationShopClient.get(
                `/categories/${req.params.categoryId}/products`,
                getDynamicRequestProps(req)
            ),
            res
        );
    })

    // PRODUCTS
    .get('/products', async (req, res) => {
        await handleShopRequest(
            gamificationShopClient.get('/products', getDynamicRequestProps(req)),
            res
        );
    })

    // CART
    .get('/cart', async (req, res) => {
        await handleShopRequest(
            gamificationShopClient.get('/cart', getDynamicRequestProps(req)),
            res
        );
    })
    .post('/cart', async (req, res) => {
        await handleShopRequest(
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

        await handleShopRequest(
            gamificationShopClient.delete(
                `/cart/items/${itemId}`,
                getDynamicRequestProps(req)
            ),
            res
        );
    })
    .post('/cart/checkout', async (req, res) => {
        const { owner, ...config } = getDynamicRequestProps(req);
        await handleShopRequest(
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
        await handleShopRequest(
            gamificationShopClient.get('/orders', getDynamicRequestProps(req)),
            res
        );
    })
    .get('/orders/pending', async (req, res) => {
        await handleShopRequest(
            gamificationShopClient.get('/orders/pending', getDynamicRequestProps(req)),
            res
        );
    });

module.exports = userRouter;
