const { Tracking } = require("../tracking/model");
const { User } = require("../users/model");
const { Log } = require("../logs/model");
const mongoose = require("mongoose");
const _messages = require("../../utils/messages");

module.exports = {
    async findAll(req, res) {
        try {
            const users = await User.find();
            const activeUsers = users.filter((e) => {
                return e.status === "ATIVO";
            });
            const inactiveUsers = users.filter((e) => {
                return e.status === "INATIVO";
            });
            const tracking = await Tracking.find({
                completion: 1,
            }).limit(1).sort({createdAt: -1});

            const login = await Log.find({ type: "LOGIN" }).limit(1).sort({createdAt: -1})

            console.log(login)

            const databaseStatus = mongoose.connection.readyState;

            const systemHealth = {
                runtimeStatus: "OK",
                databaseStatus: databaseStatus,
                activeUsers: activeUsers.length,
                inactiveUsers: inactiveUsers.length,
                lastConclusion: tracking[0].createdAt,
                lastAcess: login[0].createdAt,
            };
            return _messages.success(res, req, systemHealth);
        } catch (error) {
            return _messages.internalServer(res, req, "Internal Server Error");
        }
    },
};
