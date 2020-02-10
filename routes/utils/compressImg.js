const { PATH } = require('../../config/config')

const images = require("images");

async function compressImg(p) {
  if (Array.isArray(p)) {
    try {
      for (let i in p) {
        await images(`${PATH.ORIGINAL_IMAGE_STORAGE_PATH}/${p[i]}`)
          .size(512)
          .save(`${PATH.COMPRESSED_IMAGE_STORAGE_PATH}/${p[i]}`, {
            quality: 30
          })
      }
    } catch (error) {
      console.error(error.message)
      return error.message
    }
  } else {
    try {
      await images(`${PATH.ORIGINAL_IMAGE_STORAGE_PATH}/${p}`)
        .size(512)
        .save(`${PATH.COMPRESSED_IMAGE_STORAGE_PATH}/${p}`, {
          quality: 30
        })
    } catch (error) {
      console.error(error.message)
      return error.message
    }
  }
}

module.exports = compressImg