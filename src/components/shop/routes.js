const express = require('express');
const { getUserByToken } = require('../../utils/functions');

const gamificationShopClient = axios.create({
    baseURL: `${process.env.API_GAMIFICATION}/shop`,
    headers: {
        'x-api-key': process.env.API_KEY_GAMIFICATION,
        'x-client-id': process.env.CLIENT_ID
    }
});

const router = express.Router();

router.use(async (req, res, next) => {
    req.user = await getUserByToken(req);
    next();
});

function getDynamicRequestProps(req) {
    return {
        headers: { 'x-user-id': req.user.networkLogin },
        params: req.query,
    };
}

router
    // USER
    // CATEGORIES
    .get('/categories', async (req, res) => {
        const { data } = await gamificationShopClient.get(
            '/categories',
            getDynamicRequestProps(req)
        );

        res.json(data);
    })
    .get('/categories/:categoryId/products', async (req, res) => {
        const { categoryId } = req.params;

        const { data } = await gamificationShopClient.get(
            `/categories/${categoryId}/products`,
            getDynamicRequestProps(req)
        );

        res.json(data);
    })

    // PRODUCTS
    .get('/products', async (req, res) => {
        const { data } = await gamificationShopClient.get('/products', getDynamicRequestProps(req));

        res.json(data);
    })

    // CART
    .get('/cart', async (req, res) => {
        const { data } = await gamificationShopClient.get('/cart', getDynamicRequestProps(req));

        res.json(data);
    })
    .post('/carts/:cartId?', async (req, res) => {
        const { cartId } = req.params;

        const { item, quantity } = req.body;

        const { data } = await gamificationShopClient.post(
            `/carts/${cartId || ''}`,
            { item, quantity },
            getDynamicRequestProps(req)
        );

        res.json(data);
    })
    .delete('/carts/:cartId/items/:itemId', async (req, res) => {
        const { cartId, itemId } = req.params;

        const { data } = await gamificationShopClient.delete(
            `/carts/${cartId}/items/${itemId}`,
            getDynamicRequestProps(req)
        );

        res.json(data);
    })
    .post('/carts/:cartId/checkout', async (req, res) => {
        const { cartId } = req.params;

        const { data } = await gamificationShopClient.post(
            `/carts/${cartId}/checkout`,
            getDynamicRequestProps(req)
        );

        res.json(data);
    })

    // ORDERS
    .get('/orders', async (req, res) => {
        const { data } = await gamificationShopClient.get(
            '/orders',
            getDynamicRequestProps(req)
        );

        res.json(data);
    })
    .get('/orders/pending', async (req, res) => {
        const { data } = await gamificationShopClient.get(
            '/orders/pending',
            getDynamicRequestProps(req)
        );

        res.json(data);
    })

    // ADMIN
    // PRODUCTS
    .get('/admin/products', async (req, res) => {
        const { data } = await gamificationShopClient.get(
            '/admin/products',
            getDynamicRequestProps(req)
        );

        res.json(data);
    })
    .post('/admin/products', async (req, res) => {
        const { data } = await gamificationShopClient.post(
            '/admin/products',
            req.body,
            getDynamicRequestProps(req)
        );

        res.json(data);
    })
    .put('/admin/products/:productId', async (req, res) => {
        const { productId } = req.params;

        const { data } = await gamificationShopClient.put(
            `/admin/products/${productId}`,
            req.body,
            getDynamicRequestProps(req)
        );

        res.json(data);
    })
    .delete('/admin/products/:productId', async (req, res) => {
        const { productId } = req.params;

        const { data } = await gamificationShopClient.delete(
            `/admin/products/${productId}`,
            getDynamicRequestProps(req)
        );

        res.json(data);
    })
    .get('/admin/products/:productId/orders', async (req, res) => {
        const { productId } = req.params;

        const { data } = await gamificationShopClient.get(
            `/admin/products/${productId}/orders`,
            getDynamicRequestProps(req)
        );

        res.json(data);
    })
    .post('/admin/products/:productId/stock', async (req, res) => {
        const { productId } = req.params;

        const { data } = await gamificationShopClient.post(
            `/admin/products/${productId}/stock`,
            req.body,
            getDynamicRequestProps(req)
        );

        res.json(data);
    })

    // CATEGORIES
    .get('/admin/categories', async (req, res) => {
        const { data } = await gamificationShopClient.get(
            '/admin/categories',
            getDynamicRequestProps(req)
        );

        res.json(data);
    })
    .post('/admin/categories', async (req, res) => {
        const { data } = await gamificationShopClient.post(
            '/admin/categories',
            req.body,
            getDynamicRequestProps(req)
        );

        res.json(data);
    })
    .put('/admin/categories/:categoryId', async (req, res) => {
        const { categoryId } = req.params;

        const { data } = await gamificationShopClient.put(
            `/admin/categories/${categoryId}`,
            req.body,
            getDynamicRequestProps(req)
        );

        res.json(data);
    })
    .delete('/admin/categories/:categoryId', async (req, res) => {
        const { categoryId } = req.params;

        const { data } = await gamificationShopClient.delete(
            `/admin/categories/${categoryId}`,
            getDynamicRequestProps(req)
        );

        res.json(data);
    })

    // ORDERS
    .get('/admin/orders', async (req, res) => {
        const { data } = await gamificationShopClient.get(
            '/admin/orders',
            getDynamicRequestProps(req)
        );

        res.json(data);
    })
    .patch('/admin/orders/:orderId/:status', async (req, res) => {
        const { orderId, status } = req.params;

        const { data } = await gamificationShopClient.patch(
            `/admin/orders/${orderId}/${status}`,
            getDynamicRequestProps(req)
        );

        res.json(data);
    });


module.exports = router;
