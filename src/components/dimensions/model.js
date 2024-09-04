const mongoose = require('mongoose');
const { connect } = require('../../utils/db')
connect()

const schemaOptions = {
    strict: 'throw',
    timestamps: true,
    collation: { locale: 'en_US', strength: 1 },
}

const CategorySchema = new mongoose.Schema({
    label: { type: String, required: true }
});

const DimensionsSchema = new mongoose.Schema({
    enabled: { type: Boolean, default: true },
    thumbPath: { type: String, required: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    categories: [{ type: CategorySchema, required: true }],
    deleted: { type: Boolean, default: false }
}, {
    ...schemaOptions,
});



const Category = mongoose.model('Category', CategorySchema);
const Dimension = mongoose.model('Dimensions', DimensionsSchema);

module.exports = { Category, Dimension };
