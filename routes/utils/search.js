const { PATH } = require('../../config/config') // configurations

const url = require('url')
const album = require('../../db/models/album')
const originals = require('../../db/models/originals')
const exifs = require('../../db/models/exifs')

async function search(key) {
  let keyword = key.key
  let arr = []

  if (typeof (keyword) === 'string') {
    // search by time
    if (!isNaN(parseInt(keyword)) === true) {
      if (keyword.indexOf('-') !== -1 || keyword.indexOf('.') !== -1) {
        keyword = keyword.replace(new RegExp('-', 'g'), ':')
      }

      const reg = `${keyword}`

      const result = await exifs.aggregate([{
        $unwind: "$exifs"
      }, {
        $match: {
          'exifs.exifInfo.exif.DateTimeOriginal': {
            $regex: eval(`/${reg}/g`)
          }
        }
      }])

      if (result.length) {
        for (let i in result) {
          arr.push(`${PATH.COMPRESSED_IMAGE_URL_PREFIX}/${result[i].exifs.belongTo}`)
        }
      }

      return arr.length ? arr : 'none'
    }

    // search by location
    if (!isNaN(parseInt(keyword)) === false) {
      transKeyword = url.parse(keyword, true).href
      // keyword.replace(/\s+/g, "")
      const result = await exifs.aggregate([{
        $unwind: "$exifs"
      }, {
        $match: {
          'exifs.formattedAddress': {
            $regex: eval(`/${transKeyword}/g`)
          }
        }
      }])

      if (result.length) {
        for (let i in result) {
          arr.push(`${PATH.COMPRESSED_IMAGE_URL_PREFIX}/${result[i].exifs.belongTo}`)
        }
      }

      return arr.length ? arr : 'none'
    }
  }
}

module.exports = search