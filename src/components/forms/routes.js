const mongoose = require('mongoose');
const express = require('express');

const { getConnectMap } = require('../../utils/connect');
const { pagination, ordernation } = require('../../utils/functions');

const { setConnectMapInForm, getDefaultForm } = require('./business');

const { FormModel } = require('./model');

// Open routes
const formsUsersRouter = express.Router();

formsUsersRouter.get('/default', async (req, res) => {
    const form = await getDefaultForm();

    const connectMap = await getConnectMap(true);

    const formWithConnectFields = setConnectMapInForm(connectMap, form);

    res.json(formWithConnectFields);
});

// Admin routes
const formsAdminRouter = express.Router();

formsAdminRouter.get('/', async (req, res) => {
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

formsAdminRouter.get('/:id', async (req, res) => {
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

formsAdminRouter.post('/', async (req, res) => {
    if (req.body.isDefault) {
        await FormModel.updateMany({}, { $set: { isDefault: false } });
    }

    const form = await FormModel.create(req.body);

    res.status(201).json(form.toObject());
});

formsAdminRouter.put('/:id', async (req, res) => {
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

formsAdminRouter.put('/:id/default', async (req, res) => {
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

formsAdminRouter.delete('/:id', async (req, res) => {
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

// Main router
const formsRouter = express.Router();

formsRouter.use('/', formsUsersRouter);

formsRouter.use('/admin', formsAdminRouter);

module.exports = formsRouter;