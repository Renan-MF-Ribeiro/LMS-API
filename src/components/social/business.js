const { Trail } = require('../trails/model');
const { User } = require('../users/model');

module.exports = {
    async getUsersByIdsList(list, { searchBy, order, sort, skip, limit }) {
        const userIds = [];
        const collaboratorIds = [];

        list.forEach((listUser) => {
            userIds.push(listUser.userId);
        });

        const userQuery = {
            $and: [{ _id: { $in: userIds } }, { status: 'ATIVO' }],
        };
        if (searchBy) {
            userQuery.$and.push({
                $or: [
                    { name: { $regex: searchBy, $options: 'i' } },
                    {
                        registration: {
                            $regex: searchBy,
                            $options: 'i',
                        },
                    },
                    { email: { $regex: searchBy, $options: 'i' } },
                ],
            });
        }

        const users = await User.find(userQuery, 'name')
            .sort({ [order]: sort })
            .skip(parseInt(skip))
            .limit(parseInt(limit));
        const total = await User.countDocuments(userQuery);

        const mappedUsers = users.map((user) => {
            const listUser = list.find(
                (listUser) => listUser.userId.toString() === user._id.toString()
            );
            if (!collaboratorIds.includes(listUser.collaboratorId)) {
                collaboratorIds.push(listUser.collaboratorId);
            }
            return {
                id: user._id,
                user: user.name,
                collaboratorId: listUser.collaboratorId,
                updatedAt: listUser.updatedAt,
            };
        });

        const collaborators = await User.find(
            {
                _id: { $in: collaboratorIds },
                status: 'ATIVO',
            },
            'name'
        );

        const data = mappedUsers.map((user) => {
            const collaborator = collaborators.find(
                (collaborator) =>
                    collaborator._id.toString() ===
                    user.collaboratorId.toString()
            );
            return {
                ...user,
                collaboratorName: collaborator.name,
            };
        });

        return {
            data,
            total,
        };
    },

    async handleSearchByTrailOrUser(searchBy) {
        const searchByTrailOrUser = []
        if(searchBy) {
            const trails = await Trail.find({ title: { $regex: searchBy, $options: 'i' } })
            const users = await User.find({ name: { $regex: searchBy, $options: 'i' } })
            if(trails) searchByTrailOrUser.push(trails.map(({ _id }) => _id.toString()))
            if(users) searchByTrailOrUser.push(users.map(({ _id }) => _id.toString()))
        }

        return searchByTrailOrUser
    },

    async handleUserNameAndTrailTitle(data) {
        const trails = await Trail.find({ _id: { $in: data.map(({ trailId }) => trailId) } }, 'title')
        const users = await User.find({ _id: { $in: data.map(({ userId }) => userId)} }, 'name')

        return data.map((comment) => {
            const trail = trails.find(({ _id }) => _id.equals(comment.trailId))
            const user = users.find(({ _id }) => _id.equals(comment.userId))

            return {
                ...comment,
                userName: user?.name,
                trailTitle: trail?.title ?? 'Trilha não encontrada ou excluída'
            }
        })
    }
};
