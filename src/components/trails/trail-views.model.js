const mongoose = require('mongoose')
const { connect } = require('../../utils/db')

connect()

const TrailViewsSchema = new mongoose.Schema(
    {
        trailId: { type: 'ObjectId', ref: 'trails', required: true },
        views: [
            {
                date: Date,
                count: Number,
            },
        ],
    },
    {
        strict: 'throw',
        timestamps: true,
        collation: { locale: 'en_US', strength: 1 },
        collection: 'trail_views',
    },
)

TrailViewsSchema.index({
    trailId: 'text',
})

const TrailViews = mongoose.model('TrailView', TrailViewsSchema)

const vwTodayMostSeenTrails = new mongoose.Schema({
    title: { type: String, required: true, trim: true },
    views: { type: Number, required: true },
    updatedAt: { type: Date, required: true },
    _id: { type: { trailId: { type: 'ObjectId', ref: 'trails' } } },
})

const TodayMostSeenTrails = mongoose.model(
    'vwTodayMostSeenTrails',
    vwTodayMostSeenTrails,
    'vwTodayMostSeenTrails',
)

module.exports = {
    TrailViews,
    TodayMostSeenTrails,
}
