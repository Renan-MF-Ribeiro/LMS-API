const { default: axios } = require("axios");
const formData = require('form-data');
const fs = require('fs');
const { Trail } = require("../trails/model");
const { User } = require("../users/model");
const { Tracking } = require("../tracking/model");
const { getUserByToken } = require("../../utils/functions");

const certificateClient = axios.create({
    baseURL: process.env.API_CERTIFIER,
});

const getHeaders = (req) => ({
    Authorization: `Bearer ${req.headers.authorization}`
});

const prepareFormData = (req) => {
    const form = new formData();

    Object.keys(req.fields).forEach(key => {
        form.append(key, req.fields[key]);
    });

    if(req.files.file) form.append("file", fs.createReadStream(req.files.file.path));

    return form;
}

const updateCertificateExpirationDate = async (req) => {
    if (req.fields.payload) {
        try {
            payload = JSON.parse(req.fields.payload)
        } catch { }
    }

    try {
        await certificateClient.patch(
            `/certificates/update-expiration-date/${process.env.CLIENT_ID}`,
            {
                trailId: payload._id,
                expirationType: payload.expirationType,
            },
            {
                headers: getHeaders(req),
            }
        );
    } catch (error) {
        console.log({ error });
    }
};

async function getItemInitialDate(userId, trailId) {
    const user = await User.findById(userId).select('networkLogin').lean();

    if (!user) return null;

    const trail = await Trail.findById(trailId).select('items').lean();

    if (!trail?.items?.length) return null;

    const firstUserTracking = await Tracking.findOne({
        userLogin: user.networkLogin,
        item: { $in: trail.items.map(item => item.itemID) },
        $or: [
            { expiredCompletion: { $exists: false } },
            { expiredCompletion: { $eq: null } },
        ],
    }).sort({ createdAt: 1 });

    if (!firstUserTracking) return null;

    return firstUserTracking.createdAt;
}

async function getInitialDate(req) {
    const user = await getUserByToken(req);
    
    const { layoutId, trailId } = req.body;
    const userId = user._id;

    const { data } = await certificateClient.get(
        `/layouts/find-one/${layoutId}`,
        { headers: getHeaders(req), validateStatus: false }
    );

    if (!data?.modelOptions?.initialDate) {
        return null;
    }

    const initialDateType = data.modelOptions.initialDateType ?? 'trail';

    if (initialDateType === 'item') {
        return await getItemInitialDate(userId, trailId);
    }

    const trail = await Trail.findById(trailId).lean();

    return trail?.startDate ?? null;
}

module.exports = { 
    certificateClient,
    getHeaders,
    prepareFormData,
    updateCertificateExpirationDate,
    getInitialDate
};
