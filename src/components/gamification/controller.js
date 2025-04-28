const GamificationBusiness = require('./business');
const { User } = require('../users/model');
const { Trail } = require('../trails/model');
const _messages = require('../../utils/messages');
const { azureBlob } = require('../../utils/files');
const { handleGroupTagsGamification } = require('./utils');
const { getUserByToken } = require('../../utils/functions');

const GamificationController = {
    async updateClientUser(req, res) {
        try {
            const { networkLogin } = req.params
            const data = await GamificationBusiness.updateClientUser(networkLogin, req.body)

            return _messages.success(res, req, data);
        } catch (error) {
            return _messages.badRequest(res, req, error);
        }
    },

    async getClient(req, res) {
        try {
            const data = await GamificationBusiness.getClient()

            return _messages.success(res, req, data);
        } catch (error) {
            return _messages.badRequest(res, req, error);
        }
    },

    async getClientEvents(req, res) {
        try {
            const { networkLogin } = await getUserByToken(req)
            const data = await GamificationBusiness.getClientEvents(networkLogin)

            return _messages.success(res, req, data);
        } catch (error) {
            return _messages.badRequest(res, req, error);
        }
    },

    async updateClient(req, res) {
        try {
            const requestUserLogin = await getUserByToken(req);

            const data = await GamificationBusiness.updateClient(req.body, requestUserLogin?.networkLogin)

            return _messages.success(res, req, data);
        } catch (error) {
            return _messages.badRequest(res, req, error);
        }
    },

    async updateClientNivelImage(req, res) {
        try {
            const { nivelId } = req.params;
            const { file } = req.files;
            const data = await GamificationBusiness.updateClientNivelImage(nivelId, file)

            return _messages.success(res, req, data);
        } catch (error) {
            return _messages.badRequest(res, req, error);
        }
    },

    async getExtractByClient(req, res) {
        try {
            const data = await GamificationBusiness.getExtractByClient(req.query)

            return _messages.success(res, req, data);
        } catch (error) {
            return _messages.badRequest(res, req, error);
        }
    },

    async getExtractByUser(req, res) {
        try {
            const { networkLogin } = req.params;
            const data = await GamificationBusiness.getExtractByUser(networkLogin, req.query)

            return _messages.success(res, req, data);
        } catch (error) {
            return _messages.badRequest(res, req, error);
        }
    },

    async listRankingByUser(req, res) {
        try {
            const { networkLogin } = req.params;
            const data = await GamificationBusiness.listRankingByUser(networkLogin)

            return _messages.success(res, req, data);
        } catch (error) {
            return _messages.badRequest(res, req, error);
        }
    },

    async listRewardsByUser(req, res) {
        try {
            const { networkLogin } = req.params;
            const data = await GamificationBusiness.listRewardsByUser(networkLogin)

            return _messages.success(res, req, data);
        } catch (error) {
            return _messages.badRequest(res, req, error);
        }
    },

    async createClientUser(req, res) {
        try {
            const { user } = req.params;
            const data = await GamificationBusiness.createClientUser(user)

            return _messages.success(res, req, data);
        } catch (error) {
            return _messages.badRequest(res, req, error);
        }
    },

    async getClientUser(req, res) {
        try {
            const { networkLogin } = req.params;
            const data = await GamificationBusiness.getClientUser(networkLogin)

            if (data._id) {
                delete data._id;
            }

            if (data.clientId) {
                delete data.clientId;
            }

            if (data.eligibilities) {
                delete data.eligibilities;
            }

            return _messages.success(res, req, data);
        } catch (error) {
            return _messages.badRequest(res, req, error);
        }
    },

    async getClientRankingUsersDetails(req, res) {
        try {
            const { _id } = req.params;
            const data = await GamificationBusiness.getClientRankingUsersDetails(_id, req.query)

            return _messages.success(res, req, data);
        } catch (error) {
            return _messages.badRequest(res, req, error);
        }
    },

    async getClientRankings(req, res) {
        try {
            const data = await GamificationBusiness.getClientRankings(req.query)

            return _messages.success(res, req, data);
        } catch (error) {
            return _messages.badRequest(res, req, error);
        }
    },

    async createClientRankings(req, res) {
        try {
            const { eligibilities } = req.body;
            req.body.eligibilities = await handleGroupTagsGamification(eligibilities)

            const data = await GamificationBusiness.createClientRankings(req.body);

            return _messages.success(res, req, data);
        } catch (error) {
            return _messages.badRequest(
                res,
                req,
                error,
                'Ranking com título informado já existe'
            );
        }
    },

    async updateClientRankings(req, res) {
        try {
            const { _id } = req.params;

            if (!!req.body?.eligibilities) {
                const eligibilities = !req.body?.eligibilities?.[0]?.value
                    ? [
                        ...req.body.eligibilities?.map((eligibility) => ({
                            display: eligibility,
                            value: eligibility
                        }))
                    ]
                    : req.body.eligibilities;

                req.body.eligibilities = await handleGroupTagsGamification(eligibilities)
            }

            const requestUserLogin = await getUserByToken(req);

            const data = await GamificationBusiness.updateClientRankings(_id, req.body, requestUserLogin?.networkLogin);

            return _messages.success(res, req, data);
        } catch (error) {
            return _messages.badRequest(
                res,
                req,
                error,
                'Ranking com título informado já existe'
            );
        }
    },

    async deleteClientRankings(req, res) {
        try {
            const { _id } = req.params;
            const data = await GamificationBusiness.deleteClientRankings(_id)

            return _messages.success(res, req, data);
        } catch (error) {
            return _messages.badRequest(res, req, error);
        }
    },

    async getClientRewards(req, res) {
        try {
            const data = await GamificationBusiness.getClientRewards();
            for (let reward of data.data) {
                const newTrails = []
                for (let trail of reward.trails) {
                    const trailFind = await Trail.findById(trail)
                    newTrails.push({
                        thumbPath: trailFind.thumbPath,
                        title: trailFind.title,
                        _id: trailFind._id
                    })
                }
                reward.trails = newTrails
            }
            return _messages.success(res, req, data);
        } catch (error) {
            return _messages.badRequest(res, req, error);
        }
    },

    async createClientRewards(req, res) {
        try {
            const body = await returnBodyCreate(req);
            console.log(body)
            const data = await GamificationBusiness.createClientRewards(body);
            return _messages.success(res, req, data);
        } catch (error) {
            return _messages.badRequest(
                res,
                req,
                error,
                'Recompensa com título informado já existe'
            );
        }
    },

    async updateClientRewards(req, res) {
        try {
            const { _id } = req.params;
            const body = await returnBodyUpdate(req);

            const requestUserLogin = await getUserByToken(req);

            const data = await GamificationBusiness.updateClientRewards(_id, body, requestUserLogin?.networkLogin);
            return _messages.success(res, req, data);
        } catch (error) {
            return _messages.badRequest(
                res,
                req,
                error,
                'Recompensa com título informado já existe'
            );
        }
    },

    async deleteClientRewards(req, res) {
        try {
            const { _id } = req.params;
            const data = await GamificationBusiness.deleteClientRewards(_id);
            return _messages.success(res, req, data);
        } catch (error) {
            return _messages.badRequest(res, req, error);
        }
    },
};

const returnBodyCreate = async (req) => {
    let body = JSON.parse(req.fields.payload);
    let fileArray = Object.keys(req.files).map((key) => req.files[key]);
    for (let i in body.badges) {
        let path = await azureBlob(fileArray[i], 'gamification/badges');
        body.badges[i].path = path;
    }
    return body;
}

const returnBodyUpdate = async (req) => {
    let body = JSON.parse(req.fields.payload);
    let fileArray = Object.keys(req.files).map((key) => {
        return { key: key, file: req.files[key] }
    });
    if (fileArray.length > 0) {
        await Promise.all(fileArray.map(async (i) => {
            let path = await azureBlob(i.file, 'gamification/badges');
            const index = body.badges.findIndex((el) => el._id == i.key);
            body.badges[index].path = path;
        }));
    }
    return body;
}

module.exports = GamificationController;
