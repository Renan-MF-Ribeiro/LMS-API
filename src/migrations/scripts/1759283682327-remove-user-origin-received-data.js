const mongoose = require('mongoose')

module.exports = {
    /**
     * @param {typeof mongoose.connection.db} db MongoDB connection instance
     */
    async up(db) {
        console.log('up action');
        await db.collection('users').updateMany(
            {  'origin.receivedData': { $exists: true }},
            { $unset: { 'origin.receivedData': "" } }
        );
    },
    /**
     * @param {typeof mongoose.connection.db} db MongoDB connection instance
     */
    async down(db) {
        console.log('down action');
    }
};
