const router = require('express').Router();
router.get('/', (req, res) => res.json({ message: 'Applications route working' }));
module.exports = router;