const formidable = require('express-formidable');
const { isSegmentationException } = require('../config/business');
const { azureBlob } = require('../../utils/files');

const configJson = require('../../../config.json');

const ApiError = require('../../errors/ApiError');

const { Theme } = require('../theme/palette/model');

const { sendMessageToKafka } = require('../new-messages/business');

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

async function handleShopRequest(promise, res, postAction) {
    try {
        const response = await promise;

        const { data, status } = response;

        if (postAction) await postAction(response);

        return res.status(status)
            .json(
                data && data !== ''
                    ? data
                    : { ok: true }
            )
    } catch (error) {
        const message = error.response?.data?.stack?.message ?? error.response?.data?.message ?? error.message ?? 'Internal Server Error';
        const statusCode = error.response?.data?.stack?.status ?? error.response?.status ?? 500;
        const data = error.response?.data?.stack?.response ?? error.response?.data ?? error;

        throw new ApiError(
            message,
            statusCode,
            data,
            { skipDbLog: statusCode === 400 }
        );
    }
}

async function jsonOrFormData(req, res, next) {
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

async function sendOrderConfirmation(user, order) {
    const { orderCode, totalValue, items } = order;
    const { _id: userId, name } = user;

    function getCoinValue(value) {
        if (value % 1 === 0) return value.toFixed(0);

        return value.toFixed(2);
    }

    const theme = await Theme.findOne({ enabled: true });

    console.log('theme', theme);

    const primaryColor = theme?.palette?.primary ?? '#4CAF50';

    const message = `
        <div style="text-align: left; font-family: Arial, sans-serif; padding-bottom: 20px;">
            <h1 style="color: ${primaryColor};">Pedido realizado com sucesso!</h1>

            <p>O pedido <strong style="color: ${primaryColor};">${orderCode}</strong> foi realizado com sucesso!</p>

            <p>Confira os detalhes do pedido:</p>
            
            <ul style="list-style-type: none; padding: 0;">
                <li style="margin-bottom: 4px"><strong>Usuário:</strong> ${name}</li>
                <li><strong>Moedas (total):</strong> ${getCoinValue(totalValue)}</li>
            </ul>
            
            <table style="width: 100%; border-collapse: collapse;">
                <thead>
                    <tr>
                        <th style="border: 1px solid #ddd; padding: 8px;">Produto</th>
                        <th style="border: 1px solid #ddd; padding: 8px;">Quantidade</th>
                        <th style="border: 1px solid #ddd; padding: 8px;">Moedas</th>
                    </tr>
                </thead>
                <tbody>
                    ${items.map(item => `
                        <tr>
                            <td style="border: 1px solid #ddd; padding: 8px;">${item.product.name}</td>
                            <td style="border: 1px solid #ddd; padding: 8px;">${item.quantity}</td>
                            <td style="border: 1px solid #ddd; padding: 8px;">${getCoinValue(item.product.value)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>

            <p>Em breve entraremos em contato para confirmar o envio dos itens.</p>
        </div>
    `;

    await sendMessageToKafka({
        title: `Pedido realizado com sucesso!`,
        textHtml: message,
        text: message,
        // Default
        thumbnail: configJson.messenger.emailTemplate.thumbnail,
        category: 'notify',
        communication: ['notification', 'email'],
        mode: 'manual',
        target: {
            type: 'users',
            value: {
                users: [userId],
            },
        },
    }, [userId]);
}

module.exports = {
    getDynamicRequestProps,
    handleShopRequest,
    jsonOrFormData,
    parseProductBodyAndUploadImages,
    parseCategoryBodyAndUploadImages,
    sendOrderConfirmation,
}