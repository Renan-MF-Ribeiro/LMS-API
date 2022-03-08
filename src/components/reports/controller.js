const {
    getActiveUsers,
    getDbState,
    getInactiveUsers,
    getLastAccess,
    getLastConclusion,
} = require("./business");
const _messages = require("../../utils/messages");

module.exports = {
    async getHealthStatus(req, res) {
        console.time("Find")
        const dbState = await getDbState();
        console.log(dbState);
        if (dbState) {
            const systemHealth = {
                runtimeStatus: true,
                databaseStatus: dbState,
            };
            console.timeEnd("Find")
            return _messages.success(res, req, systemHealth);
        } else {
            const systemHealth = {
                runtimeStatus: true,
                databaseStatus: dbState,
            };
            return _messages.success(res, req, systemHealth);
        }
    },

    async getHealthStatusWithDetails(req, res){
        const dbState = await getDbState();
        if (dbState) {
            const activeUsers = await getActiveUsers();
            const inactiveUsers = await getInactiveUsers();
            const lastAccess = await getLastAccess();
            const lastConclusion = await getLastConclusion();
            const systemHealth = {
                runtimeStatus: true,
                databaseStatus: dbState,
                activeUsers: activeUsers,
                inactiveUsers: inactiveUsers,
                lastConclusion: lastConclusion,
                lastAccess: lastAccess,
            };
            return _messages.success(res, req, systemHealth);
        } else {
            const systemHealth = {
                runtimeStatus: true,
                databaseStatus: dbState,
            };
            return _messages.success(res, req, systemHealth);
        }
    }
};
