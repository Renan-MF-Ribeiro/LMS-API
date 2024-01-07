const axios = require('axios');
const _messages = require('../../utils/messages');
const { getUserByToken } = require('../../utils/functions');

const host = process.env.API_ALURA;
const clientId = process.env.CLIENT_ID;
const headers = { 'x-client-key': process.env.API_KEY_ALURA };

const AluraController = {
	async addResources(req, res) {
		try {
			const { resources } = req.body
			const uri = `${host}/clients/${clientId}`;
			const { data } = await axios.patch(uri, { resources }, { headers });

			return _messages.success(res, req, data);
		} catch (error) {
			return _messages.internalServer(res, req, error)
		}
	},

	async getSections(req, res) {
		try {
			const uri = `${host}/courses/sections/${clientId}`;
			const { data } = await axios.get(uri, { headers });

			return _messages.success(res, req, data);
		} catch (error) {
			return _messages.internalServer(res, req, error)
		}
	},

	async listByTrails(req, res) {
		try {
			const { email } = await getUserByToken(req)
			const uri = `${host}/courses/trails/${clientId}/${email}`;
			const { data } = await axios.get(uri, { headers });

			return _messages.success(res, req, data);
		} catch (error) {
			return _messages.internalServer(res, req, error)
		}
	},

	async getByTrails(req, res) {
		try {
			const { email } = await getUserByToken(req)
			const { trailId } = req.params;
			const uri = `${host}/courses/trails/${clientId}/${email}/${trailId}`;
			const { data } = await axios.get(uri, { headers });

			return _messages.success(res, req, data);
		} catch (error) {
			return _messages.internalServer(res, req, error)
		}
	},

	async launch(req, res) {
		try {
			const { itemId } = req.params
			const { email } = await getUserByToken(req)
			const uri = `${host}/courses/launch/${clientId}/${email}/${itemId}`
			const { data: launchUrl } = await axios.get(uri, { headers })
			
			res.redirect(302, launchUrl.redirect);
		} catch(error) {
			return _messages.internalServer(res, req, error)
		}
	}
};

module.exports = AluraController;
