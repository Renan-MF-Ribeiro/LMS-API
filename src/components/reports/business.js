const { Tracking } = require("../tracking/model");
const { User } = require("../users/model");
const { Log } = require("../logs/model");
const mongoose = require("mongoose");

module.exports = {
    async getActiveUsers() {
        return User.countDocuments({'status': 'ATIVO'});
    },

    async getInactiveUsers() {
        return User.countDocuments({'status':'INATIVO'})
    },

    async getLastConclusion() {
        const tracking = await Tracking.find({
            completion: 1,
        })
            .limit(1)
            .sort({ createdAt: -1 });
        return tracking[0].createdAt;
    },

    async getLastAccess() {
        const login = await Log.find({ type: "LOGIN" })
            .limit(1)
            .sort({ createdAt: -1 });
        return login[0].createdAt;
    },

    async getDbState() {
        const mongoStatus = mongoose.connection.readyState;
        const databaseStatus = mongoStatus === 1 ? true : false;
        return databaseStatus;
    },
};
