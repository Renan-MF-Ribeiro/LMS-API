const mongoose = require('mongoose');

const FieldSchema = new mongoose.Schema({
    key: { type: String, required: true },
    required: { type: Boolean, required: false, default: false },
    columns: { type: Number, required: false, default: 1 },
}, { timestamps: true, strict: false });

const SectionSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String, required: false },
    index: { type: Number, required: false, default: 0 },
    fields: { type: [FieldSchema], required: true, default: [] },
}, { timestamps: true, strict: false })

const FormSchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: { type: String, required: false },
    displayType: { type: String, required: true, default: 'list' }, // list | steps
    sections: { type: [SectionSchema], required: false, default: [] },
}, { timestamps: true, strict: false });

const FormModel = mongoose.model('forms', FormSchema);

module.exports = {
    FormModel,
}
