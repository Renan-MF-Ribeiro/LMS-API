const GamificationBusiness = require('./business');
const GamificationEventBusiness = require('./events/business');
const { User } = require('../users/model');
const config = require('../../../config.json');
const axios = require('axios');
const _messages = require('../../utils/messages');
const { Group } = require('../groups/model');

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
                const data = await GamificationBusiness.getClientEvents()

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
                const groups = await Group.find({ tags: { $in: eligibilities }, active: 1 });
                const tags = eligibilities.map(({ value }) => value);
                const groupsTags = groups.map(({ name }) => ({ name, tags: [...new Set(tags)] }));

                const data = await GamificationBusiness.createClientRankings({
                    ...req.body,
                    eligibilities: groupsTags
                });

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
                
                if(!!req.body?.eligibilities) {
                    const eligibilities = !req.body?.eligibilities?.[0]?.value
                        ? [
                              ...req.body.eligibilities?.map((eligibility) => ({
                                  display: eligibility,
                                  value: eligibility
                              }))
                          ]
                        : req.body.eligibilities;
                    const groups = await Group.find({ tags: { $in: eligibilities }, active: 1 });
                    const tags = eligibilities.map(({ value }) => value);
                    const groupsTags = groups.map(({ name }) => ({ name, tags: [...new Set(tags)] }));
                    req.body.eligibilities = groupsTags
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
};

module.exports = GamificationController;
