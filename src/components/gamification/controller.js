const GamificationBusiness = require('./business');
const { User } = require('../users/model');
const config = require('../../../config.json');
const axios = require('axios');
const _messages = require('../../utils/messages');
const FormData = require('form-data');
const fs = require('fs');

const GamificationController = {
    async dispatch(networkLogin, categories, props) {
        if (config.gamification.active) {
            const user = await User.findOne({ networkLogin });
            try {
                for (const category of categories) {
                    await GamificationBusiness[category](user, category, props);
                }
            } catch (err) {
                console.log(err);
            }
        }
    },

    async getClient(req, res) {
        if (config.gamification.active) {
            try {
                const host = process.env.API_GAMIFICATION;
                const clientId = process.env.CLIENT_ID;
                const uri = `${host}/clients/${clientId}`;
                const { data } = await axios.get(uri, {
                    headers: {
                        'x-api-key': process.env.API_KEY_GAMIFICATION,
                    },
                });

                return _messages.success(res, req, data);
            } catch (error) {
                return _messages.badRequest(res, req, error);
            }
        }
    },

    async getClientEvents(req, res) {
        if (config.gamification.active) {
            try {
                const host = process.env.API_GAMIFICATION;
                const clientId = process.env.CLIENT_ID;
                const uri = `${host}/clients/${clientId}/events`;
                const { data } = await axios.get(uri, {
                    headers: {
                        'x-api-key': process.env.API_KEY_GAMIFICATION,
                    },
                });

                return _messages.success(res, req, data);
            } catch (error) {
                return _messages.badRequest(res, req, error);
            }
        }
    },

    async updateClient(req, res) {
        if (config.gamification.active) {
            try {
                const host = process.env.API_GAMIFICATION;
                const clientId = process.env.CLIENT_ID;
                const uri = `${host}/clients/${clientId}`;
                const { data } = await axios.put(uri, req.body, {
                    headers: {
                        'x-api-key': process.env.API_KEY_GAMIFICATION,
                    },
                });

                return _messages.success(res, req, data);
            } catch (error) {
                return _messages.badRequest(res, req, error);
            }
        }
    },

    async updateClientNivelImage(req, res) {
        if (config.gamification.active) {
            try {
                const { file } = req.files;
                const host = process.env.API_GAMIFICATION;
                const clientId = process.env.CLIENT_ID;
                const { nivelId } = req.params;
                const uri = `${host}/clients/${clientId}/${nivelId}`;
                const formData = new FormData();
                formData.append(
                    'file',
                    fs.createReadStream(file.path),
                    file.name
                );
                const { data } = await axios.put(uri, formData, {
                    headers: {
                        'x-api-key': process.env.API_KEY_GAMIFICATION,
                        'Content-Type': 'multipart/form-data',
                        ...formData.getHeaders(),
                    },
                });

                return _messages.success(res, req, data);
            } catch (error) {
                return _messages.badRequest(res, req, error);
            }
        }
    },

    async getExtract(req, res) {
        if (config.gamification.active) {
            try {
                const { networkLogin } = req.params;
                const host = process.env.API_GAMIFICATION;
                const clientId = process.env.CLIENT_ID;
                const query = new URLSearchParams(req.query);
                const uri = `${host}/event-users/${clientId}/${networkLogin}?${query}`;
                const { data } = await axios.get(uri, {
                    headers: {
                        'x-api-key': process.env.API_KEY_GAMIFICATION,
                    },
                });

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
                const host = process.env.API_GAMIFICATION;
                const clientId = process.env.CLIENT_ID;
                const uri = `${host}/ranking-users/${clientId}/${networkLogin}`;
                const { data } = await axios.get(uri, {
                    headers: {
                        'x-api-key': process.env.API_KEY_GAMIFICATION,
                    },
                });

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
                const host = process.env.API_GAMIFICATION;
                const clientId = process.env.CLIENT_ID;
                const query = new URLSearchParams(req.query);
                const uri = `${host}/ranking-users/${clientId}/${_id}/details?${query}`;
                const { data } = await axios.get(uri, {
                    headers: {
                        'x-api-key': process.env.API_KEY_GAMIFICATION,
                    },
                });

                return _messages.success(res, req, data);
            } catch (error) {
                return _messages.badRequest(res, req, error);
            }
        }
    },

    async getClientRankings(req, res) {
        if (config.gamification.active) {
            try {
                const host = process.env.API_GAMIFICATION;
                const clientId = process.env.CLIENT_ID;
                const query = new URLSearchParams(req.query);
                const uri = `${host}/rankings/${clientId}?${query}`;
                const { data } = await axios.get(uri, {
                    headers: {
                        'x-api-key': process.env.API_KEY_GAMIFICATION,
                    },
                });

                return _messages.success(res, req, data);
            } catch (error) {
                return _messages.badRequest(res, req, error);
            }
        }
    },

    async createClientRankings(req, res) {
        if (config.gamification.active) {
            try {
                const host = process.env.API_GAMIFICATION;
                const clientId = process.env.CLIENT_ID;
                const uri = `${host}/rankings/${clientId}`;
                const { data } = await axios.post(uri, req.body, {
                    headers: {
                        'x-api-key': process.env.API_KEY_GAMIFICATION,
                    },
                });

                return _messages.success(res, req, data);
            } catch (error) {
                return _messages.badRequest(res, req, error);
            }
        }
    },

    async updateClientRankings(req, res) {
        if (config.gamification.active) {
            try {
                const { _id } = req.params;
                const host = process.env.API_GAMIFICATION;
                const clientId = process.env.CLIENT_ID;
                const uri = `${host}/rankings/${clientId}/${_id}`;
                const { data } = await axios.put(uri, req.body, {
                    headers: {
                        'x-api-key': process.env.API_KEY_GAMIFICATION,
                    },
                });

                return _messages.success(res, req, data);
            } catch (error) {
                return _messages.badRequest(res, req, error);
            }
        }
    },

    async deleteClientRankings(req, res) {
        if (config.gamification.active) {
            try {
                const { _id } = req.params;
                const host = process.env.API_GAMIFICATION;
                const clientId = process.env.CLIENT_ID;
                const uri = `${host}/rankings/${clientId}/${_id}`;
                const { data } = await axios.delete(uri, {
                    headers: {
                        'x-api-key': process.env.API_KEY_GAMIFICATION,
                    },
                });

                return _messages.success(res, req, data);
            } catch (error) {
                return _messages.badRequest(res, req, error);
            }
        }
    },
};

module.exports = GamificationController;
