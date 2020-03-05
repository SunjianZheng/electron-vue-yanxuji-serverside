const {
  PATH
} = require('../config/config') // configurations

const router = require('koa-router')()
const queryString = require('querystring')
const upload = require('./utils/upload')
const moment = require('moment')

const album = require('../db/models/album') // collection albums
const originals = require('../db/models/originals') // collection originals
const compresseds = require('../db/models/compressed') // collection compressed
const exifs = require('../db/models/exifs') // collection exifs

const getExif = require('./utils/getExif')
const deleteImg = require('./utils/deleteImg')
const search = require('./utils/search')
const getAddr = require('./utils/getCord')
const getRandomArrayElements = require('./utils/getRandomArrayElements')
const compressImg = require('./utils/compressImg')
const findUnusedID = require('./utils/findUnusedID') // search for unused id(missing number) from array


router.prefix('/api')

/**
 * @route   api/test
 * @desc    test
 */
router.get('/test', async (ctx) => {
  ctx.status = 200
  ctx.body = {
    msg: 'accessing successed'
  }
})

/**
 * @route   api/createAlbum
 * @desc    create an album
 * @params  name
 */
router.post('/createAlbum', async (ctx) => {
  const query = queryString.parse(ctx.querystring)

  const result = await new Promise((resolve, reject) => {
    album.find({}).exec(async (err, data) => {
      if (err) reject(err)

      const arr = []
      const idArr = []
      let unusedID = undefined

      for (let i in data[0].albums) {
        arr.push(data[0].albums[i].name)
        idArr.push(data[0].albums[i].id)
      }

      idArr.indexOf(0) === -1 ? unusedID = 0 : unusedID = undefined

      if (arr.indexOf(query.name) === -1) {
        // create a new subdocument in collection album
        const newItem = {
          id: unusedID === undefined ? data[0].albums.length++ : unusedID,
          name: query.name,
          avatar: '',
          describe: query.describe,
          type: query.type,
          createdTime: moment().locale('zh-cn').format('YYYY-MM-DD HH:mm:ss')
        }
        await album.updateOne({}, {
          $addToSet: {
            albums: newItem
          }
        })
        resolve({
          status: 200,
          body: 1
        })
      } else {
        reject({
          status: 404,
          body: 'name is already exist'
        })
      }
    })
  })

  ctx.status = result.status
  ctx.body = result.body
})

/**
 * @route   api/uploadImg
 * @desc    get upload img from frontend and do something
 * @params  albumName
 */

router.post('/uploadImg', upload.array('file', 12), async (ctx) => {
  const query = queryString.parse(ctx.querystring)

  const url = `${PATH.ORIGINAL_IMAGE_URL_PREFIX}/${ctx.req.files[0].filename}`
  const compressedImgUrl = `${PATH.COMPRESSED_IMAGE_URL_PREFIX}/${ctx.req.files[0].filename}`

  try {
    // compress the img and save it to public/compressedImg
    await compressImg(ctx.req.files[0].filename)

    // const name = await album.findOne({}, {
    //   albums: {
    //     $elemMatch: {
    //       id: query.id
    //     }
    //   }
    // })

    // add img's url and it's related album name to collection originals
    await originals.updateOne({
      $addToSet: {
        originals: {
          // belongTo: name.albums[0].name,
          belongTo: query.name,
          url: url
        }
      }
    })

    // add compressed img's url and it's related album name to collection compressed
    await compresseds.updateOne({
      $addToSet: {
        compresseds: {
          // belongTo: name.albums[0].name,
          belongTo: query.name,
          url: compressedImgUrl
        }
      }
    })

    // set last upload img as album's avatar
    await album.updateOne({
      // 'albums.id': query.id 
      'albums.name': query.name
    }, {
      'albums.$.avatar': compressedImgUrl
    })

    ctx.status = 200
    ctx.body = 1
  } catch (error) {
    ctx.status = 404
    ctx.body = error.message
  }
  // ctx.body = {
  //   msg: 'upload successed',
  //   filename: 'http://localhost/originalImg/' + ctx.req.files[0].filename // return file name
  // }
})

/**
 * @route   api/getAlbum
 * @desc    get all album info, in order to render the landing page
 */
router.get('/getAlbum', async (ctx) => {
  // get album info from table album
  try {
    const result = await album.find({})
    if (result.length === 0) {
      ctx.status = 200
      ctx.body = {
        msg: '无结果!'
      }
    } else {
      ctx.status = 200
      ctx.body = {
        albums: result[0].albums
      }
    }
  } catch (error) {
    console.error(error)
  }
})

/**
 * @route   api/getAlbumImg
 * @desc    get img info in exact album, in order to render the album page
 * @params  albumName
 */
router.get('/getAlbumImg', async (ctx) => {
  // TODO: get img urls in table compressedImg
  ctx.status = 200
  ctx.body = {
    msg: 'all imgs in exact album info'
  }
})

/**
 * @route   api/getExif
 * @desc    get img exif info, in order to render the img details page
 * @params  albumName, imgId
 */
router.get('/getExif', async (ctx) => {
  const query = queryString.parse(ctx.querystring)
  const path = `${PATH.ORIGINAL_IMAGE_STORAGE_PATH}/${query.name}`
  try {
    const result = await getExif(path)

    if (result === undefined) {
      ctx.status = 404
      ctx.body = 'No Exif segment found in the given image.'
    } else {
      const gpsInfo = result.gps

      // if have exif infos but do not have gps info
      const kArr = Object.keys(gpsInfo)
      const coorAndAddr = kArr.length !== 0 ? await getAddr(gpsInfo) : {
        coor: '',
        addr: ''
      }

      // update when document doesn't exist
      await exifs.findOne({}, {
        exifs: {
          $elemMatch: {
            belongTo: query.name
          }
        }
      }).exec(async (err, data) => {
        if (!data.exifs.length) {
          await exifs.updateOne({
            $addToSet: {
              exifs: {
                belongTo: query.name,
                coor: coorAndAddr.coor,
                formattedAddress: coorAndAddr.addr,
                exifInfo: result
              }
            }
          })
        }
      })
      // add coordinate and address
      const body = {
        coor: coorAndAddr.coor,
        addr: coorAndAddr.addr,
        exif: result
      }

      ctx.status = 200
      ctx.body = body
    }
  } catch (error) {
    ctx.status = 404
    ctx.body = error.message
  }
})

/**
 * @route   api/getOriginalImg
 * @desc    get original img urls, in order to get high quilty img
 * @params  albumName, imgId
 */
router.get('/getOriginalImg', async (ctx) => {
  const query = queryString.parse(ctx.querystring)

  try {
    const name = await album.findOne({}, {
      albums: {
        $elemMatch: {
          id: query.id
        }
      }
    })

    const result = await originals.aggregate([{
      $unwind: "$originals"
    }, {
      $match: {
        "originals.belongTo": name.albums[0].name
      }
    }])

    const arr = []
    for (let i in result) {
      arr.push(result[i].originals.url)
    }

    if (arr) {
      ctx.status = 200
      ctx.body = arr
    } else {
      ctx.status = 404
      ctx.body = 'none'
    }
  } catch (error) {
    ctx.status = 404
    ctx.body = error.message
  }
})

/**
 * @route   api/getCompressedImg
 * @desc    get compressed img urls, in order to get low quilty img
 * @params  albumName, imgId
 */
router.get('/getCompressedImg', async (ctx) => {
  const query = queryString.parse(ctx.querystring)

  try {
    const name = await album.findOne({}, {
      albums: {
        $elemMatch: {
          name: query.name
        }
      }
    })

    const result = await compresseds.aggregate([{
      $unwind: "$compresseds"
    }, {
      $match: {
        "compresseds.belongTo": name.albums[0].name
      }
    }])

    const arr = []
    for (let i in result) {
      arr.push(result[i].compresseds.url)
    }
    console.log(arr)

    if (arr) {
      ctx.status = 200
      ctx.body = arr
    } else {
      ctx.status = 404
      ctx.body = 'none'
    }
  } catch (error) {
    ctx.status = 404
    ctx.body = error.message
  }
})

/**
 * @route   api/deleteImg
 * @desc    delete img from DB
 * @params  url
 */
router.post('/deleteImg', async (ctx) => {
  const query = queryString.parse(ctx.querystring)

  const url = `${PATH.ORIGINAL_IMAGE_URL_PREFIX}/${query.url}`
  const compressedImgUrl = `${PATH.COMPRESSED_IMAGE_URL_PREFIX}/${query.url}`

  const original = url.split('/');
  const pathOriginal = `${PATH.ORIGINAL_IMAGE_STORAGE_PATH}/${original[4]}`

  const compressed = compressedImgUrl.split('/');
  const pathCompressed = `${PATH.COMPRESSED_IMAGE_STORAGE_PATH}/${compressed[4]}`

  try {
    // delete compressed img from collection compresseds
    await compresseds.findOneAndUpdate({}, {
      "$pull": {
        "compresseds": {
          "url": compressedImgUrl
        }
      }
    })

    // delete compressed img from public/compressed
    deleteImg(pathCompressed)

    // delete original img from collection originals
    await originals.findOneAndUpdate({}, {
      "$pull": {
        "originals": {
          "url": url
        }
      }
    })

    // delete original img from public/originalImg
    deleteImg(pathOriginal)

    ctx.status = 200
    ctx.body = 1
  } catch (error) {
    ctx.status = 404
    ctx.body = error.message
  }
})

/**
 * @route   api/deleteAlbum
 * @desc    delete an album and it's items
 * @params  name
 */

router.post('/deleteAlbum', async (ctx) => {
  const query = queryString.parse(ctx.querystring)

  try {
    // delete the index of the album in the collection albums
    await album.findOneAndUpdate({}, {
      "$pull": {
        "albums": {
          "name": query.name
        }
      }
    })


    /*-----------------------------------------------------------*/

    try {
      let compressedUrlArr = []

      // find img under album
      const compressed = await compresseds.aggregate([{
        $unwind: "$compresseds"
      }, {
        $match: {
          "compresseds.belongTo": query.name
        }
      }])

      // get img's path
      for (let i in compressed) {
        let url = compressed[i].compresseds.url
        let u = url.split('/');
        let path = `${PATH.COMPRESSED_IMAGE_STORAGE_PATH}/${u[4]}`
        compressedUrlArr.push(path)
      }

      try {
        // delete img's url documents from collection compresseds
        await compresseds.updateOne({}, {
          "$pull": {
            "compresseds": {
              "belongTo": query.name
            }
          }
        }, {
          multi: true
        })
      } catch (error) {
        console.error('ERROR: delete compressed from collection error', error.message)
      }

      // delete img from the public folder
      deleteImg(compressedUrlArr)
    } catch (error) {
      console.error('ERROR: delete compressed error', error.message)
    }

    /*-----------------------------------------------------------*/

    try {
      let originalUrlArr = []

      // find img under album
      const original = await originals.aggregate([{
        $unwind: "$originals"
      }, {
        $match: {
          "originals.belongTo": query.name
        }
      }])

      // get img's path
      for (let i in original) {
        let url = original[i].originals.url
        let u = url.split('/');
        let path = `${PATH.ORIGINAL_IMAGE_STORAGE_PATH}/${u[4]}`
        originalUrlArr.push(path)
      }

      try {
        // delete img's url documents from collection originals
        await originals.updateOne({}, {
          "$pull": {
            "originals": {
              "belongTo": query.name
            }
          }
        }, {
          multi: true
        })
      } catch (error) {
        console.error('ERROR: delete original from collection error', error.message)
      }

      // delete img from the public folder
      deleteImg(originalUrlArr)
    } catch (error) {
      console.error('ERROR: delete original error', error.message)
    }

    ctx.status = 200
    ctx.body = 1
  } catch (error) {
    ctx.status = 404
    ctx.body = error.message
  }
})

/**
 * @route   api/changeAvatar
 * @desc    change album's avatar when delete img from DB
 * @params  id, url
 */
router.post('/changeAvatar', async (ctx) => {
  const query = queryString.parse(ctx.querystring)

  try {
    await album.updateOne({
      'albums.id': query.id
    }, {
      'albums.$.avatar': +query.url === 0 ? '' : `${PATH.COMPRESSED_IMAGE_URL_PREFIX}/${query.url}`
    })

    ctx.status = 200
    ctx.body = 1
  } catch (error) {
    ctx.status = 404
    ctx.body = erroe.message
  }
})

/**
 * @route   api/search
 * @desc    search img
 * @params  keyword
 */
router.get('/search', async (ctx) => {
  const query = queryString.parse(ctx.querystring)

  try {
    const result = await search(query)
    if (result !== 'none') {
      ctx.status = 200
      ctx.body = result
    } else {
      ctx.status = 404
      ctx.body = '无结果!'
    }
  } catch (error) {
    ctx.status = 404
    ctx.body = error
  }

})

/**
 * @route   api/recommand
 * @desc    random return 5 imgs from collection compresseds
 * @params  none
 */
router.get('/recommand', async (ctx) => {
  try {
    let result = await compresseds.findOne()
    let arr = []
    for (let i in result.compresseds) {
      arr.push(result.compresseds[i].url)
    }
    const selectedElements = getRandomArrayElements(arr, 6)
    ctx.status = 200
    ctx.body = selectedElements
  } catch (error) {
    ctx.status = 404
    ctx.body = '无结果!'
  }
})

router.post('/updateAlbumID', async (ctx) => {
  try {
    // get all ID in collection albums
    const allID = await album.aggregate([{
      $unwind: "$albums"
    }, {
      $match: {
        'albums.id': {
          $gte: 0
        }
      }
    }, {
      $project: {
        'albums.id': 1
      }
    }])

    const allIDArr = []
    for (let i in allID) {
      allIDArr.push(allID[i].albums.id)
    }

    // find unused ID
    const unusedID = findUnusedID(allIDArr)

    // search for sub documents whitch greater than unused ID
    // in order to prevent error, index of collection albums's id must start with 0
    // search for unused id in collection albums(here is an id array)
    const id = await album.aggregate([{
      $unwind: "$albums"
    }, {
      $match: {
        "albums.id": {
          $gt: unusedID
        }
      }
    }, {
      $project: {
        "albums.id": 1,
      }
    }])

    // update ID in colllection albums in order to make them continuous
    for (let i in id) {
      await album.updateOne({
        'albums.id': {
          $eq: id[i].albums.id
        }
      }, {
        $set: {
          'albums.$.id': --id[i].albums.id
        }
      })
    }

    ctx.status = 200
    ctx.body = 1
  } catch (error) {
    ctx.status = 404
    ctx.body = error.message
  }
})

module.exports = router