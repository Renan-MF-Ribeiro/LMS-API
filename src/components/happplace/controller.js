
const { API_HAPPPLACE } = process.env;

module.exports = {
    async sso (req, res) {
        try {
            const { token } = req.query;
            res.redirect(302, `${API_HAPPPLACE}/sso?token=${token}`);
        } catch (error) { }
    }
}