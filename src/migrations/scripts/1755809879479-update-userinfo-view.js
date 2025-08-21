const mongoose = require('mongoose')

module.exports = {
    /**
     * 
     * @param {typeof mongoose.connection.db} db MongoDB connection instance
     */
    async up(db) {
        // Drop the userInfo view
        await db.collection('userInfo').drop();

        // create a new view
        await db.createCollection('userInfo', {
            viewOn: 'users',
            pipeline: [
                {
                    $project: {
                        _id: 1,
                        updatedAt: 1,
                        keyvalue: { $objectToArray: "$$ROOT" }
                    }
                },
                { $unwind: "$keyvalue" },
                {
                    $match: {
                        $expr: {
                            $ne: [
                                { $type: "$keyvalue.v" },
                                "array"
                            ]
                        }
                    }
                },
                {
                    $project: {
                        _id: 1,
                        updatedAt: 1,
                        key: {
                            $convert: {
                                input: "$keyvalue.k",
                                to: "string"
                            }
                        },
                        value: {
                            $convert: {
                                input: "$keyvalue.v",
                                to: "string",
                                onError: null
                            }
                        }
                    }
                }
            ]
        });

        console.log('userInfo view created');
    },
    /**
     * 
     * @param {typeof mongoose.connection.db} db MongoDB connection instance
     */
    async down(db) {
        console.log('no down action');
    }
};
