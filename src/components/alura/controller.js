const axios = require('axios');
const _messages = require('../../utils/messages');

const host = process.env.API_ALURA;
const clientId = process.env.CLIENT_ID;
const headers = { 'x-client-key': process.env.API_KEY_ALURA };

const AluraController = {
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
			const { email } = req.params;
			const uri = `${host}/courses/trails/${clientId}/${email}`;
			const { data } = await axios.get(uri, { headers });

			return _messages.success(res, req, data);
		} catch (error) {
			return _messages.internalServer(res, req, error)
		}
	},

	async getByTrails(req, res) {
		try {
			const { email, idSubcategory } = req.params;
			const uri = `${host}/courses/trails/${clientId}/${email}/${idSubcategory}`;
			const { data } = await axios.get(uri, { headers });

			return _messages.success(res, req, data);
		} catch (error) {
			return _messages.internalServer(res, req, error)
		}
	},
};

module.exports = AluraController;
