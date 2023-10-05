module.exports = {
    async createComment(req, res) {
        try {
            const uri = `${API_SOCIAL}/comment/${CLIENT_ID}`;
            const body = req.body
            const { data } = await axios.post(uri, body);

            return _messages.success(req, res, data)
        } catch (error) {
            console.log(error)
            return _messages.badRequest(error)
        }
    },
    async getAllComments(req, res) {
        try {
            const uri = `${API_SOCIAL}/comment/${CLIENT_ID}`;
            const { data } = await axios.get(uri);

            return _messages.success(req, res, data)
        } catch (error) {
            console.log(error)
            return _messages.badRequest(error)
        }
    },
    async getCommentsByTrailId(req, res) {
        try {
            const { trailId } = req.params
            const uri = `${API_SOCIAL}/comment/${trailId}`;
            const { data } = await axios.get(uri);

            return _messages.success(req, res, data)
        } catch (error) {
            console.log(error)
            return _messages.badRequest(error)
        }
    },
    async updateComment(req, res) {
        try {
            const { commentId } = req.params
            const body = req.body
            const uri = `${API_SOCIAL}/comment/${commentId}`;
            const { data } = await axios.put(uri, body);

            return _messages.success(req, res, data)
        } catch (error) {
            console.log(error)
            return _messages.badRequest(error)
        }
    },
    async createLike(req, res) {
        try {
            const uri = `${API_SOCIAL}/like/${CLIENT_ID}`;
            const body = req.body
            const { data } = await axios.post(uri, body);

            return _messages.success(req, res, data)
        } catch (error) {
            console.log(error)
            return _messages.badRequest(error)
        }
    },
    async getLikesByTrailId(req, res) {
        try {
            const { trailId } = req.params
            const uri = `${API_SOCIAL}/like/${trailId}`;
            const { data } = await axios.get(uri);

            return _messages.success(req, res, data)
        } catch (error) {
            console.log(error)
            return _messages.badRequest(error)
        }
    },
    async deleteLike(req, res) {
        try {
            const uri = `${API_SOCIAL}/like`;
            const body = req.body
            const { data } = await axios.delete(uri, body);

            return _messages.success(req, res, data)
        } catch (error) {
            console.log(error)
            return _messages.badRequest(error)
        }
    },
    async createFavorite(req, res) {
        try {
            const uri = `${API_SOCIAL}/favorite/${CLIENT_ID}`;
            const body = req.body
            const { data } = await axios.post(uri, body);

            return _messages.success(req, res, data)
        } catch (error) {
            console.log(error)
            return _messages.badRequest(error)
        }
    },
    async getFavoritesByUserId(req, res) {
        try {
            const { userId } = req.params
            const uri = `${API_SOCIAL}/favorite/${userId}`;
            const { data } = await axios.get(uri);

            return _messages.success(req, res, data)
        } catch (error) {
            console.log(error)
            return _messages.badRequest(error)
        }
    },
    async updateFavorite(req, res) {
        try {
            const { favoriteId } = req.params
            const body = req.body
            const uri = `${API_SOCIAL}/favorite/${favoriteId}`;
            const { data } = await axios.put(uri, body);

            return _messages.success(req, res, data)
        } catch (error) {
            console.log(error)
            return _messages.badRequest(error)
        }
    },
    async generate(req, res) {
        try {
            const user = await getUserByToken(req);
            const uri = `${process.env.API_CONNECT}/system-users/${process.env.CLIENT_ID}`;
            let data;
            try {
                const { data: responseData } = await axios.post(
                    uri,
                    {
                        userId: user._id,
                    },
                    {
                        headers: {
                            'system-user-key': process.env.CONNECT_CLIENT_KEY,
                        },
                    }
                );
                data = responseData;
            } catch (err) {
                console.error(err);
                throw err;
            }

            _messages.success(
                res,
                req,
                data,
                'Credenciais geradas com sucesso',
                'system-users',
                'generate'
            );
        } catch (error) {
            console.log(error);
            _messages.internalServer(
                res,
                req,
                error.message,
                null,
                'social',
                'generate'
            );
        }
    },

    async getActive(req, res) {
        try {
            const uri = `${process.env.API_CONNECT}/system-users/${process.env.CLIENT_ID}`;

            let data;
            try {
                const { data: responseData } = await axios.get(uri, {
                    headers: {
                        'system-user-key': process.env.CONNECT_CLIENT_KEY,
                    },
                });
                data = responseData;
            } catch (err) {
                if (err.response.data.statusCode === 404) {
                    _messages.notFound(
                        res,
                        req,
                        JSON.stringify(err.response.data),
                        'nenhuma key ativa encontrada para o cliente',
                        'system-users',
                        'getActive'
                    );
                    return;
                } else {
                    throw err;
                }
            }

            _messages.success(
                res,
                req,
                data,
                'Key solicitada com sucesso',
                'system-users',
                'getActive'
            );
        } catch (error) {
            console.log(error);
            _messages.internalServer(
                res,
                req,
                error.message,
                null,
                'social',
                'getActive'
            );
        }
    },
};

