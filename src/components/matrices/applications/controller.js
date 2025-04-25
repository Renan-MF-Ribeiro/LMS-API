const { matricesApi } = require('../http-adapter');
const { getFirstTenUsersByGroup } = require('../../users/business');
const { searchTrailBy } = require('../../trails/business');
const { searchCourseBy } = require('../../courses/business');
const { User } = require('../../users/model');
const { Group } = require('../../groups/model');

const ApplicationsController = {
    findAll: async (req, res) => {
        try {
            const options = req.query;
            const { data } = await matricesApi.get('/applications', { params: options });
            res.status(data.statusCode).json(data.data);
        } catch (error) {
            const statusCode = error.response?.data?.statusCode ?? 500;
            const errorMessage = error.response?.data?.message ?? 'Internal server error';
            res.status(statusCode).json(errorMessage);
        }
    },

    findApplicationsPerUser: async (req, res) => {
        try {
            const id = req.params.id;
            const options = req.query;

            const user = await User.findOne({ _id: id });
            
            if (!user) {
                return res.status(404).json("Usuário não encontrado");
            }

            const userGroups = await Group.find({ name: { $in: user?.groupsAD } }, 'name tags') || [];
            const tags = userGroups?.flatMap((group) => group?.tags?.map((tag) => tag?.value)).join(',') || [];

            const { data } = await matricesApi.get(`/applications/elegible/${id}`, { params: { tags, options } });
            res.status(data.statusCode).json(data.data);
        } catch (error) {
            console.log({ ERRO: error.message });
            const statusCode = error.response?.data?.statusCode ?? 500;
            const errorMessage = error.response?.data?.message ?? 'Internal server error';
            res.status(statusCode).json(errorMessage);
        }
    },

    searchContent: async (req, res) => {
        try {
            const type = req.params?.type;
            const searchBy = req.query?.searchBy;

            let response = [];

            switch (type) {
                case 'trails':
                    response = await searchTrailBy(searchBy);
                    break;
                case 'courses':
                    response = await searchCourseBy(searchBy);
                    break;
                default:
                    response = "Insira um tipo de busca válido: 'trails' ou 'courses'";
                    break;
            }

            res.status(200).json(response);
        } catch (error) {
            console.log({ ERRO: error.message });
            const statusCode = error.response?.data?.statusCode ?? 500;
            const errorMessage = error.response?.data?.message ?? 'Internal server error';
            res.status(statusCode).json(errorMessage);
        }
    },

    findOne: async (req, res) => {
        try {
            const { id } = req.params;
            const { data } = await matricesApi.get(`/applications/${id}`);
            res.status(data.statusCode).json(data.data);
        } catch (error) {
            const statusCode = error.response?.data?.statusCode ?? 500;
            const errorMessage = error.response?.data?.message ?? 'Internal server error';
            res.status(statusCode).json(errorMessage);
        }
    },

    preview: async (req, res) => {
        try {
            const dto = req.body;
            const eligibilities = dto.eligibilities;

            const [{ data: matrice }, users] = await Promise.all([
                matricesApi.get(`/matrices/${dto.matrixId}`),
                getFirstTenUsersByGroup(eligibilities),
            ]);
            const response = {
                matriceTitle: matrice.data.title,
                matriceCategories: matrice.data.categories.map((category) => {
                    return { category: category.title, skills: category.skills };
                }),
                users: users.map((user) => ({
                    name: user.name,
                    networkLogin: user.networkLogin,
                    office: user.office,
                })),
            };

            res.status(200).json(response);
        } catch (error) {
            const statusCode = error.response?.data?.statusCode ?? 500;
            const errorMessage = error.response?.data?.message ?? error.message;
            res.status(statusCode).json(errorMessage);
        }
    },

    create: async (req, res) => {
        try {
            const { data } = await matricesApi.post('/applications', req.body);
            res.status(data.statusCode).json(data.data);
        } catch (error) {
            const statusCode = error.response?.data?.statusCode ?? 500;
            const errorMessage = error.response?.data?.message ?? 'Internal server error';
            res.status(statusCode).json(errorMessage);
        }
    },

    update: async (req, res) => {
        try {
            const id = req.params?.id;

            const { data } = await matricesApi.patch(`/applications/${id}`, req.body);
            res.status(data.statusCode).json(data.data);
        } catch (error) {
            const statusCode = error.response?.data?.statusCode ?? 500;
            const errorMessage = error.response?.data?.message ?? 'Internal server error';
            res.status(statusCode).json(errorMessage);
        }
    },

    delete: async (req, res) => {
        try {
            const id = req.params?.id;

            const { data } = await matricesApi.delete(`/applications/${id}`, req.body);
            res.status(data.statusCode).json(data.data);
        } catch (error) {
            const statusCode = error.response?.data?.statusCode ?? 500;
            const errorMessage = error.response?.data?.message ?? 'Internal server error';
            res.status(statusCode).json(errorMessage);
        }
    },
};

module.exports = ApplicationsController;
