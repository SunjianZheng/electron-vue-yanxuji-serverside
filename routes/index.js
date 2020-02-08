const router = require('koa-router')()

/**
 * @route   /
 * @desc    indexPage
 * @access  public
 */
router.get('/', async (ctx, next) => {
  await ctx.render('index', {
    title: '炎序集 — 服务端'
  })
})


module.exports = router
