const mongoose = require('mongoose');
const express = require('express');

const { getConnectMap } = require('../../utils/connect');
const { pagination, ordernation } = require('../../utils/functions');

const { setConnectMapInForm, getDefaultForm, getAdminForm } = require('./business');

const { FormModel } = require('./model');
const { validateTokenRoute, isAdmin } = require('../../utils/middlewares');

const formsRouter = express.Router();

// Open routes
formsRouter.get('/list', async (req, res) => {
    const forms = await FormModel.find({
        $or: [
            { deletedAt: null },
            { deletedAt: { $exists: false } },
        ]
    }, { _id: 1, name: 1, type: 1 }).lean();

    res.json(forms);
});

formsRouter.get('/default', async (req, res) => {
    const form = await getDefaultForm();

    const connectMap = await getConnectMap(true);

    const formWithConnectFields = setConnectMapInForm(connectMap, form);

    res.json(formWithConnectFields);
});

formsRouter.get('/admin', async (req, res) => {
    const form = await getAdminForm();

    const connectMap = await getConnectMap(true);

    const formWithConnectFields = setConnectMapInForm(connectMap, form);

    res.json(formWithConnectFields);
});

formsRouter.get('/:id', async (req, res) => {
    const { id } = req.params;

    const form = await FormModel.findOne({
        _id: new mongoose.Types.ObjectId(id),
        $or: [
            { deletedAt: null },
            { deletedAt: { $exists: false } },
        ]
    }).lean();

    if (!form) {
        return res.status(404).json({ message: `Form '${id}' not found` });
    }

    const connectMap = await getConnectMap(true);

    const formWithConnectFields = setConnectMapInForm(connectMap, form);

    res.json(formWithConnectFields);
});

// Admin routes
formsRouter.use(validateTokenRoute);

formsRouter.get('/', async (req, res) => {
    const { skip, limit } = pagination(req);
    const { sort, order } = ordernation(req);
    const { searchBy } = req.query;

    const query = {
        isDefault: false,
        $and: [
            {
                $or: [
                    { deletedAt: null },
                    { deletedAt: { $exists: false } },
                ]
            },
            {
                ...(searchBy && {
                    $or: [
                        { name: { $regex: searchBy, $options: 'i' } },
                        { description: { $regex: searchBy, $options: 'i' } },
                    ]
                })
            }
        ],
    };

    const total = await FormModel.countDocuments(query);

    const forms = await FormModel.find(query)
        .sort({ [order]: sort })
        .skip(Number(skip))
        .limit(Number(limit))
        .lean();

    const connectMap = await getConnectMap(true);

    const mappedForms = forms.map((form) => setConnectMapInForm(connectMap, form));

    res.json({ data: mappedForms, total });
});

formsRouter.post('/', async (req, res) => {
    if (req.body.isDefault) {
        await FormModel.updateMany({}, { $set: { isDefault: false } });
    }

    const form = await FormModel.create(req.body);

    res.status(201).json(form.toObject());
});

formsRouter.put('/:id', async (req, res) => {
    const { id } = req.params;

    const currentForm = await FormModel.findOne({
        _id: new mongoose.Types.ObjectId(id),
        $or: [
            { deletedAt: null },
            { deletedAt: { $exists: false } },
        ]
    }).lean();

    if (!currentForm) {
        return res.status(404).json({ message: `Form '${id}' not found` });
    }

    if (req.body.isDefault) {
        await FormModel.updateMany({}, { $set: { isDefault: false } });
    }

    const updatedForm = await FormModel.findByIdAndUpdate(currentForm._id, { $set: req.body }, { new: true });

    res.json(updatedForm);
});

formsRouter.put('/:id/default', async (req, res) => {
    const { id } = req.params;

    const currentForm = await FormModel.findOne({
        _id: new mongoose.Types.ObjectId(id),
        $or: [
            { deletedAt: null },
            { deletedAt: { $exists: false } },
        ]
    }).lean();

    if (!currentForm) {
        return res.status(404).json({ message: `Form '${id}' not found` });
    }

    await FormModel.updateMany({}, { $set: { isDefault: false } });

    const updatedForm = await FormModel.findByIdAndUpdate(
        currentForm._id,
        { $set: { isDefault: true } },
        { new: true }
    );

    res.json(updatedForm);
});

formsRouter.put('/:id/admin', async (req, res) => {
    const { id } = req.params;

    const currentForm = await FormModel.findOne({
        _id: new mongoose.Types.ObjectId(id),
        $or: [
            { deletedAt: null },
            { deletedAt: { $exists: false } },
        ]
    }).lean();

    if (!currentForm) {
        return res.status(404).json({ message: `Form '${id}' not found` });
    }

    await FormModel.updateMany({}, { $set: { isAdmin: false } });

    const updatedForm = await FormModel.findByIdAndUpdate(
        currentForm._id,
        { $set: { isAdmin: true } },
        { new: true }
    );

    res.json(updatedForm);
});

formsRouter.delete('/:id', async (req, res) => {
    const { id } = req.params;

    const currentForm = await FormModel.findOne({
        _id: new mongoose.Types.ObjectId(id),
        $or: [
            { deletedAt: null },
            { deletedAt: { $exists: false } },
        ]
    }).lean();

    if (!currentForm) {
        return res.status(404).json({ message: `Form '${id}' not found` });
    }

    await FormModel.findByIdAndUpdate(currentForm._id, { $set: { deletedAt: new Date() } });

    res.json({ message: `Form '${id}' deleted` });
});

formsRouter.post('/:id/duplicate', async (req, res) => {
    const { id } = req.params;

    const currentForm = await FormModel.findOne({
        _id: new mongoose.Types.ObjectId(id),
        $or: [
            { deletedAt: null },
            { deletedAt: { $exists: false } },
        ]
    }).lean();

    if (!currentForm) {
        return res.status(404).json({ message: `Form '${id}' not found` });
    }

    const newForm = { ...currentForm, _id: undefined, name: `${currentForm.name} - Cópia`, isDefault: false, isAdmin: false };

    const form = await FormModel.create(newForm);

    res.status(201).json(form.toObject());
});

module.exports = formsRouter;