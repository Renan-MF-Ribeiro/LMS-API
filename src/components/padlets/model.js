const mongoose = require("mongoose");
const { connect } = require("../../utils/db");
connect();
const PadletSchema = new mongoose.Schema({
    trailId: { type: "ObjectId", ref: "trails", required: true },
    userId: { type: "ObjectId", ref: "users", required: true },
    text: { type: String, required: true, trim: true },
    type: {
        type: String,
        enum: ["EXPECTATION", "CONCLUSION"],
        default: "EXPECTATION",
        required: true,
    },
},{
    timestamps: true
});
const Padlet = mongoose.model("Padlet", PadletSchema);
module.exports = {
    Padlet,
};
