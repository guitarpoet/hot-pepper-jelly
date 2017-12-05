/**
 * The router module for the sample server
 *
 * @author Jack <jack@thinkingcloud.info>
 * @version 1.0.0
 * @date Tue Dec  5 17:35:22 2017
 */

const { Router } = require('express');

const router = new Router();

router.get("/", (req, res) => {
    res.send("Hello world abc");
});

module.exports = router;
