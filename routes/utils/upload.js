const { PATH } = require('../../config/config')

const multer = require('koa-multer')

const storage = multer.diskStorage({
  // file storage path
  destination: function (req, file, cb) {
    cb(null, `${PATH.ORIGINAL_IMAGE_STORAGE_PATH}`)
  },
  // rename the file
  filename: function (req, file, cb) {
    var fileFormat = (file.originalname).split(".")
    cb(null, Date.now() + "." + fileFormat[fileFormat.length - 1])
  }
})

const upload = multer({
  storage: storage
})

module.exports = upload