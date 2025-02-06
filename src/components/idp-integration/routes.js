const express = require("express");
const mongoose = require("mongoose");
const { validateTokenRoute, isAdmin } = require("../../utils/middlewares");
const { pagination, ordernation } = require("../../utils/functions");
const { IdpIntegrationModel } = require("./models");
const { getActiveIdpIntegrations } = require("./business");

const idpIntegrationRouter = express.Router();

idpIntegrationRouter.use(validateTokenRoute)

idpIntegrationRouter.get("/is-active", async (req, res) => {
    const idpIntegrations = await getActiveIdpIntegrations();

    res.json({
        active: idpIntegrations?.length > 0
    });
});

idpIntegrationRouter.use(isAdmin);

idpIntegrationRouter.get("/", async (req, res) => {
    const { skip = 0, limit = 10 } = pagination(req);
    const { order = 'createdAt', sort = 'desc' } = ordernation(req);
    const { searchBy } = req.query;

    const query = {
        ...(searchBy && { strategyName: { $regex: searchBy, $options: 'i' } })
    };

    const total = await IdpIntegrationModel.countDocuments(query);

    const data = await IdpIntegrationModel
        .find(query)
        .select({
            _id: true,
            name: true,
            strategyName: true,
            active: true,
            keyField: true,
            valueSeparator: true,
        })
        .skip(Number(skip))
        .limit(Number(limit))
        .sort({ [order]: sort });

    res.json({ total, data });
});

idpIntegrationRouter.get("/:id", async (req, res) => {
    const { id } = req.params;

    const idpIntegration = await IdpIntegrationModel.findById(id)

    res.json(idpIntegration);
});

idpIntegrationRouter.post("/", async (req, res) => {
    const { body } = req;

    const newIdpIntegration = {
        ...body,
        valueSeparator: body.valueSeparator?.length ? body.valueSeparator : ',',
        strategyName: body.strategyName?.length ? body.strategyName : null,
        profiles: body.profiles.map(profile => ({
            name: profile.name,
            profiles: profile.profiles
        }))
    }

    const idpIntegration = await IdpIntegrationModel.create(newIdpIntegration);

    return res.json(idpIntegration)
});

idpIntegrationRouter.put("/:id", async (req, res) => {
    const { id } = req.params;
    const { body } = req;

    const idpIntegration = await IdpIntegrationModel.findByIdAndUpdate(
        id,
        {
            ...body,
            valueSeparator: body.valueSeparator?.length ? body.valueSeparator : ',',
            strategyName: body.strategyName?.length ? body.strategyName : null,
            profiles: body.profiles.map(profile => ({
                _id: mongoose.Types.ObjectId.isValid(profile._id)
                    ? new mongoose.Types.ObjectId(profile._id)
                    : new mongoose.Types.ObjectId(),
                name: profile.name,
                profiles: profile.profiles
            }))
        },
        { new: true }
    )

    res.json(idpIntegration);
});

idpIntegrationRouter.patch("/:id/:status", async (req, res) => {
    const { id, status } = req.params;

    const idpIntegration = await IdpIntegrationModel.findByIdAndUpdate(
        id,
        { active: status === 'active' },
        { new: true }
    )

    res.json(idpIntegration);
});

idpIntegrationRouter.delete("/:id", async (req, res) => {
    const { id } = req.params;

    await IdpIntegrationModel.findByIdAndDelete(id);

    res.json({ message: 'IdpIntegration deleted' });
});

module.exports = idpIntegrationRouter;

