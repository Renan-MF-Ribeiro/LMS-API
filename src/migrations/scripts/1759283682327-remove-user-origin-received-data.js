const mongoose = require('mongoose')

module.exports = {
    /**
     * @param {typeof mongoose.connection.db} db MongoDB connection instance
     */
    async up(db) {
        console.log('up action');
        const result = await db.collection('users').updateMany(
            {  'origin.receivedData': { $exists: true }},
            { $unset: { 'origin.receivedData': "" } }
        );

        console.log(`Modified ${result.modifiedCount} documents`);
    },
    /**
     * @param {typeof mongoose.connection.db} db MongoDB connection instance
     */
    async down(db) {
        console.log('down action');
    }
};
