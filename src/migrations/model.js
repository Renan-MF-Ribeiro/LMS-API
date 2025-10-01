const mongoose = require("mongoose");

const MigrationsSchema = new mongoose.Schema({
    fileName: { type: String, required: true },
    status: { type: String, enum: ["pending", "completed", "failed"], default: "pending" },
}, { timestamps: true });

const Migrations = mongoose.model("migrations", MigrationsSchema);

module.exports = {
    Migrations,
};
