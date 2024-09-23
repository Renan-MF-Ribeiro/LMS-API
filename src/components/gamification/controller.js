const GamificationBusiness = require('./business');
const GamificationEventBusiness = require('./events/business');
const { User } = require('../users/model');
const { Trail } = require('../trails/model');
const config = require('../../../config.json');
const _messages = require('../../utils/messages');
const { azureBlob } = require('../../utils/files');
const { handleGroupTagsGamification } = require('./utils');
const { getUserByToken } = require('../../utils/functions');

const GamificationController = {
    async dispatch(networkLogin, categories, props) {
        if (config.gamification.active) {
            const user = await User.findOne({ networkLogin });
            try {
                for (const category of categories) {
                    await GamificationEventBusiness[category](user, category, props);
                }
            } catch (err) {
                console.log(err);
            }
        }
    },

    async updateClientUser(req, res) {
        if (config.gamification.active) {
            try {
                const { networkLogin } = req.params
                const data = await GamificationBusiness.updateClientUser(networkLogin, req.body)

                return _messages.success(res, req, data);
            } catch (error) {
                return _messages.badRequest(res, req, error);
            }
        }
    },

    async getClient(req, res) {
        if (config.gamification.active) {
            try {
                const data = await GamificationBusiness.getClient()

                return _messages.success(res, req, data);
            } catch (error) {
                return _messages.badRequest(res, req, error);
            }
        }
    },

    async getClientEvents(req, res) {
        if (config.gamification.active) {
            try {
                const { networkLogin } = await getUserByToken(req)
                const data = await GamificationBusiness.getClientEvents(networkLogin)

                return _messages.success(res, req, data);
            } catch (error) {
                return _messages.badRequest(res, req, error);
            }
        }
    },

    async updateClient(req, res) {
        if (config.gamification.active) {
            try {
                const data = await GamificationBusiness.updateClient(req.body)

                return _messages.success(res, req, data);
            } catch (error) {
                return _messages.badRequest(res, req, error);
            }
        }
    },

    async updateClientNivelImage(req, res) {
        if (config.gamification.active) {
            try {
                const { nivelId } = req.params;
                const { file } = req.files;
                const data = await GamificationBusiness.updateClientNivelImage(nivelId, file)

                return _messages.success(res, req, data);
            } catch (error) {
                return _messages.badRequest(res, req, error);
            }
        }
    },

    async getExtractByClient(req, res) {
        if (config.gamification.active) {
            try {
                const data = await GamificationBusiness.getExtractByClient(req.query)

                return _messages.success(res, req, data);
            } catch (error) {
                return _messages.badRequest(res, req, error);
            }
        }
    },

    async getExtractByUser(req, res) {
        if (config.gamification.active) {
            try {
                const { networkLogin } = req.params;
                const data = await GamificationBusiness.getExtractByUser(networkLogin, req.query)

                return _messages.success(res, req, data);
            } catch (error) {
                return _messages.badRequest(res, req, error);
            }
        }
    },

    async listRankingByUser(req, res) {
        if (config.gamification.active) {
            try {
                const { networkLogin } = req.params;
                const data = await GamificationBusiness.listRankingByUser(networkLogin)

                return _messages.success(res, req, data);
            } catch (error) {
                return _messages.badRequest(res, req, error);
            }
        }
    },

    async listRewardsByUser(req, res) {
        if (config.gamification.active) {
            try {
                const { networkLogin } = req.params;
                const data = await GamificationBusiness.listRewardsByUser(networkLogin)

                return _messages.success(res, req, data);
            } catch (error) {
                return _messages.badRequest(res, req, error);
            }
        }
    },

    async createClientUser(req, res) {
        if (config.gamification.active) {
            try {
                const { user } = req.params;
                const data = await GamificationBusiness.createClientUser(user)

                return _messages.success(res, req, data);
            } catch (error) {
                return _messages.badRequest(res, req, error);
            }
        }
    },

    async getClientUser(req, res) {
        if (config.gamification.active) {
            try {
                const { networkLogin } = req.params;
                const data = await GamificationBusiness.getClientUser(networkLogin)

                return _messages.success(res, req, data);
            } catch (error) {
                return _messages.badRequest(res, req, error);
            }
        }
    },

    async getClientRankingUsersDetails(req, res) {
        if (config.gamification.active) {
            try {
                const { _id } = req.params;
                const data = await GamificationBusiness.getClientRankingUsersDetails(_id, req.query)

                return _messages.success(res, req, data);
            } catch (error) {
                return _messages.badRequest(res, req, error);
            }
        }
    },

    async getClientRankings(req, res) {
        if (config.gamification.active) {
            try {
                const data = await GamificationBusiness.getClientRankings(req.query)

                return _messages.success(res, req, data);
            } catch (error) {
                return _messages.badRequest(res, req, error);
            }
        }
    },

    async createClientRankings(req, res) {
        if (config.gamification.active) {
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
        }
    },

    async updateClientRankings(req, res) {
        if (config.gamification.active) {
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

                const data = await GamificationBusiness.updateClientRankings(_id, req.body);

                return _messages.success(res, req, data);
            } catch (error) {
                return _messages.badRequest(
                    res,
                    req,
                    error,
                    'Ranking com título informado já existe'
                );
            }
        }
    },

    async deleteClientRankings(req, res) {
        if (config.gamification.active) {
            try {
                const { _id } = req.params;
                const data = await GamificationBusiness.deleteClientRankings(_id)

                return _messages.success(res, req, data);
            } catch (error) {
                return _messages.badRequest(res, req, error);
            }
        }
    },

    async getClientRewards(req, res) {
        if (config.gamification.active) {
            try {
                const data = await GamificationBusiness.getClientRewards();
                for(let reward of data.data) {
                    const newTrails = []
                   for(let trail of reward.trails) {
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
        }
    },

    async createClientRewards(req, res) {
        if (config.gamification.active) {
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
        }
    },

    async updateClientRewards(req, res) {
        if (config.gamification.active) {
            try {
                const { _id } = req.params;
                const body = returnBodyUpdate(req);
                const data = await GamificationBusiness.updateClientRewards(_id, body);
                return _messages.success(res, req, data);
            } catch (error) {
                return _messages.badRequest(
                    res,
                    req,
                    error,
                    'Recompensa com título informado já existe'
                );
            }
        }
    },

    async deleteClientRewards(req, res) {
        if (config.gamification.active) {
            try {
                const { _id } = req.params;
                const data = await GamificationBusiness.deleteClientRewards(_id);
                return _messages.success(res, req, data);
            } catch (error) {
                return _messages.badRequest(res, req, error);
            }
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
        return { key: key, file: req.files[key]}
    });
    if (fileArray) {
        for (const i of fileArray) {
            let path = await azureBlob(i.file, 'gamification/badges')
            console.log("PATH", path)
            console.log("\nKEY", i.key)
            const index = body.badges.findIndex((el) => el._id == i.key)
            console.log("\nINDEX", index)
            body.badges[index].path = path
        }
    }
    return body;
}

module.exports = GamificationController;
