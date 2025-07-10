const managersController = {
    pendingActions: async (req, res) => {
        return res.status(308).json('Favor utilizar o novo endpoint {api}/manager/pending-actions/:target');
    },

    findUsers: async (req, res) => {
        return res.status(308).json('Favor utilizar o novo endpoint {api}/manager/users/');
    },

    getUser: async (req, res) => {
        return res.status(308).json('Favor utilizar o novo endpoint {api}/manager/users/:id');
    },

    getOverview: async (req, res) => {
        return res.status(308).json('Favor utilizar o novo endpoint {api}/manager/overview/');
    },

    getOverviewById: async (req, res) => {
        return res.status(308).json('Favor utilizar o novo endpoint {api}/manager/overview/:id');
    },

};

module.exports = managersController;