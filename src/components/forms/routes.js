const express = require('express');

const _functions = require('../../utils/functions');
const { getConnectMap } = require('../../utils/connect');

const { setConnectMapInForm } = require('./business');

const { FormModel } = require('./model');

const formsRouter = express.Router();

formsRouter.get('/', async (req, res) => {
    const { skip, limit } = _functions.pagination(req);
    const { sort, order } = _functions.ordernation(req);
    const { searchBy } = req.query;

    const query = {
        ...(searchBy && {
            $or: [
                { name: { $regex: searchBy, $options: 'i' } },
                { description: { $regex: searchBy, $options: 'i' } },
            ]
        })
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

formsRouter.get('/:id', async (req, res) => {
    const { id } = req.params;

    const form = await FormModel.findById(id).lean();

    if (!form) {
        return res.status(404).json({ message: `Form '${id}' not found` });
    }

    const connectMap = await getConnectMap(true);

    const formWithConnectFields = setConnectMapInForm(connectMap, form);

    res.json(formWithConnectFields);
});

formsRouter.post('/', async (req, res) => {
    const form = await FormModel.create(req.body);

    res.status(201).json(form);
});

formsRouter.put('/:id', async (req, res) => {
    const { id } = req.params;

    const currentForm = await FormModel.findById(id);

    if (!currentForm) {
        return res.status(404).json({ message: `Form '${id}' not found` });
    }

    const updatedForm = await FormModel.findByIdAndUpdate(currentForm._id, { $set: req.body }, { new: true });

    res.json(updatedForm);
});

module.exports = formsRouter;