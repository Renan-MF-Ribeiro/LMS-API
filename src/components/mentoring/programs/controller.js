const { mentoringApi } = require('../http-adapter');
const _messages = require('../../../utils/messages');
const {
  azureBlob,
} = require('../../../utils/files');
const { populateUserFields } = require('../business');


module.exports = {
  async createProgram(req, res) {
    const body = JSON.parse(req.fields.payload) ?? null;
    const { banner } = req.files;
    if (banner) {
      body.banner = await azureBlob(banner, 'mentoring/banners');
    }

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
    const body = JSON.parse(req.fields.payload) ?? null;
    const { banner } = req.files;
    if (banner) {
      body.banner = await azureBlob(banner, 'mentoring/banners');
    }
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
      const options = { ...req.query };
      const { data } = (await mentoringApi.get(`/programs`, { params: options }));
      const populatedData = await populateUserFields(
        [
          { fieldName: 'users', reference: 'mentees' },
          { fieldName: 'user', reference: 'menteeId' },
          { fieldName: 'user', reference: 'userId' },
        ],
        data
      );

      return _messages.success(res, req, populatedData, 'ok', 'mentoring', 'program list retrieved successfully');
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

  async home(req, res) {
    try {
      const options = { ...req.query };
      const { data } = (await mentoringApi.get(`/programs/home`, { params: options }));

      return _messages.success(res, req, data, 'ok', 'mentoring', 'program list retrieved successfully');
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

  async getById(req, res) {
    try {
      const id = req.params.id;
      const { data } = (await mentoringApi.get(`/programs/details/${id}`));

      const populatedData = await populateUserFields(
        [
          { fieldName: 'users', reference: 'mentees' },
          { fieldName: 'user', reference: 'menteeId' },
          { fieldName: 'user', reference: 'userId' },
        ],
        data
      );

      return _messages.success(res, req, populatedData.data, 'ok', 'mentoring', 'program details retrieved successfully');
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
