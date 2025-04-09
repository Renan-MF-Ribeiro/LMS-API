const { mentoringApi } = require('../http-adapter');
const _messages = require('../../../utils/messages');
const clientId = process.env.CLIENT_ID;

module.exports = {
  async createProgram(req, res) {
    const body = req.body;
    try {
      const { data } = await mentoringApi.post(`/programs`, body);
      return _messages.success(res, req, data, 'ok', 'mentoring', 'program created successfully');
    } catch (error) {
      return _messages.internalServer(
        res,
        req,
        JSON.stringify(error.response?.data?.error?.internalMessage) ?? error.message,
        error.response?.data?.message ?? error.message,
        'mentoring',
        'createProgram'
      );
    }
  },

  async updateProgram(req, res) {
    const body = req.body;
    try {
      const { data } = await mentoringApi.patch(`/programs/${req.params.id}`, body);
      return _messages.success(res, req, data, 'ok', 'mentoring', 'program updated successfully');
    } catch (error) {
      return _messages.internalServer(
        res,
        req,
        JSON.stringify(error.response?.data?.error?.internalMessage) ?? error.message,
        error.response?.data?.message ?? error.message,
        'mentoring',
        'updateProgram'
      );
    }
  },

  async deleteProgram(req, res) {
    const body = req.body;
    try {
      const { data } = await mentoringApi.delete(`/programs/${req.params.id}`, body);
      return _messages.success(res, req, data, 'ok', 'mentoring', 'program deleted successfully');
    } catch (error) {
      return _messages.internalServer(
        res,
        req,
        JSON.stringify(error.response?.data?.error?.internalMessage) ?? error.message,
        error.response?.data?.message ?? error.message,
        'mentoring',
        'deleteProgram'
      );
    }
  },

  async list(req, res) {
    try {
      const options = req.query;
      const { data } = await mentoringApi.get(`/programs`, { params: options });
      return _messages.success(res, req, data.data, 'ok', 'mentoring', 'program list retrieved successfully');
    } catch (error) {
      return _messages.internalServer(
        res,
        req,
        JSON.stringify(error.response?.data?.error?.internalMessage) ?? error.message,
        error.response?.data?.message ?? error.message,
        'mentoring',
        'listPrograms'
      );
    }
  },
};