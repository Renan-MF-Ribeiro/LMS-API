const { mentoringApi } = require('../http-adapter');
const _messages = require('../../../utils/messages');
const clientId = process.env.CLIENT_ID;

module.exports = {
  async createTopic(req, res) {
    const body = req.body;
    try {
      const { data } = await mentoringApi.post(`/topics`, body);
      return _messages.success(res, req, data, 'ok', 'mentoring', 'Topic created successfully');
    } catch (error) {
      return _messages.internalServer(
        res,
        req,
        JSON.stringify(error.response?.data?.error?.internalMessage) ?? error.message,
        error.response?.data?.message ?? error.message,
        'mentoring',
        'createTopic'
      );
    }
  },

  async updateTopic(req, res) {
    const body = req.body;
    try {
      const { data } = await mentoringApi.patch(`/topics/${req.params.id}`, body);
      return _messages.success(res, req, data, 'ok', 'mentoring', 'Topic updated successfully');
    } catch (error) {
      return _messages.internalServer(
        res,
        req,
        JSON.stringify(error.response?.data?.error?.internalMessage) ?? error.message,
        error.response?.data?.message ?? error.message,
        'mentoring',
        'updateTopic'
      );
    }
  },

  async deleteTopic(req, res) {
    const body = req.body;
    try {
      const { data } = await mentoringApi.delete(`/topics/${req.params.id}`, body);
      return _messages.success(res, req, data, 'ok', 'mentoring', 'Topic deleted successfully');
    } catch (error) {
      return _messages.internalServer(
        res,
        req,
        JSON.stringify(error.response?.data?.error?.internalMessage) ?? error.message,
        error.response?.data?.message ?? error.message,
        'mentoring',
        'deleteTopic'
      );
    }
  },

  async list(req, res) {
    try {
      const options = req.query;
      const { data } = await mentoringApi.get(`/topics`, { params: options });
      return _messages.success(res, req, data, 'ok', 'mentoring', 'Topic list retrieved successfully');
    } catch (error) {
      return _messages.internalServer(
        res,
        req,
        JSON.stringify(error.response?.data?.error?.internalMessage) ?? error.message,
        error.response?.data?.message ?? error.message,
        'mentoring',
        'listTopics'
      );
    }
  },
};