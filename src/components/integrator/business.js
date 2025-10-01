const axios = require('axios');

module.exports = {
  async getIntegratorConfig() {
    const url = `${process.env.API_INTEGRATOR}/connection/config/${process.env.CLIENT_ID}`;

    const headers = {
      'x-api-key': process.env.API_KEY_INTEGRATOR,
    };

    const response = await axios({
      method: 'get',
      url,
      headers,
      validateStatus: () => true,
    });
    return response.data;
  }
}