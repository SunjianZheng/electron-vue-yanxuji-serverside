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
          body: {
            code: 200,
            message: '创建成功!'
          }
        })
      } else {
        reject({
          status: 404,
          body: {
            code: 404,
            message: '相册名已存在!'}
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
    ctx.body = {
      code: 200,
      message: '上传成功!',
      files: `${PATH.COMPRESSED_IMAGE_URL_PREFIX}/${ctx.req.files[0].filename}`
    }
  } catch (error) {
    ctx.status = 502
    ctx.body = {
      code: 502,
      message: '上传失败!',
      err: error.message
    }
  }
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
        code: 200,
        message: '无结果!'
      }
    } else {
      ctx.status = 200
      ctx.body = {
        code: 200,
        albums: result[0].albums
      }
    }
  } catch (error) {
    console.error(error)
    ctx.status = 404
    ctx.body = {
      code: 404,
      message: error.message
      
    }
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
      ctx.status = 200
      ctx.body = {
        code: 200,
        message: 'No Exif segment found in the given image.'
      }
      return
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
      const exifResults = {
        coor: coorAndAddr.coor,
        addr: coorAndAddr.addr,
        exif: result
      }

      ctx.status = 200
      ctx.body = {
        code: 200,
        exifResults
      }
    }
  } catch (error) {
    ctx.status = 404
    ctx.body = {
      code: 404,
      message: '不存在exif信息!',
      err: error.message
    }
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

    if (arr && arr.length != 0) {
      ctx.status = 200
      ctx.body = {
        code: 200,
        compressedImgUrlArr: arr.sort((a, b) => b.split('/')[4].split('.')[0] - a.split('/')[4].split('.')[0])
      }
    } else {
      ctx.status = 400
      ctx.body = {
        code: 400,
        message: '相册内没有相片!'
        // compressedImgUrlArr: []
      }
    }
  } catch (error) {
    ctx.status = 404
    ctx.body = {
      code: 404,
      message: '资源请求失败',
      err: error.message
    }
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
    ctx.body = {
      code: 200,
      message: '删除成功'
    }
  } catch (error) {
    ctx.status = 404
    ctx.body = {
      code: 404,
      message: error.message
    }
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
    ctx.body = {
      code: 200,
      message: '删除成功!'
    }
  } catch (error) {
    ctx.status = 404
    ctx.body = {
      code: 404,
      // message: error.message
      message: '删除失败!'
    }
  }
})

/**
 * @route   api/changeAvatar
 * @desc    change album's avatar when delete img from DB
 * @params  name, url
 */
router.post('/changeAvatar', async (ctx) => {
  const {
    name,
    url
  } = queryString.parse(ctx.querystring)

  try {
    await album.updateOne({
      'albums.name': name
    }, {
      'albums.$.avatar': +url === 0 ? '' : `${PATH.COMPRESSED_IMAGE_URL_PREFIX}/${url}`
    })

    ctx.status = 200
    ctx.body = {
      code: 200,
      message: '更新封面成功!'
    }
  } catch (error) {
    ctx.status = 404
    ctx.body = {
      code: 404,
      message: error.message
    }
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
      ctx.body = {
        code: 200,
        result
      }
    } else {
      ctx.status = 400
      ctx.body = {
        code: 400,
        message: '查询无结果!'
      }
    }
  } catch (error) {
    ctx.status = 404
    ctx.body = {
      code: 404,
      message: '错误',
      err: error.message
    }
  }

})

/**
 * @route   api/getRecommendPhotos
 * @desc    random return 5 imgs from collection compresseds
 * @params  none
 */
router.get('/getRecommendPhotos', async (ctx) => {
  try {
    let result = await compresseds.findOne()
    let arr = []
    for (let i in result.compresseds) {
      arr.push(result.compresseds[i].url)
    }
    const selectedElements = getRandomArrayElements(arr, 6)
    ctx.status = 200
    ctx.body = {
      code: 200,
      photos: selectedElements
    }
  } catch (error) {
    ctx.status = 400
    ctx.body = {
      code: 400,
      message: '推荐无结果, 请上传图像!',
      err: error.message
      
    }
  }
})

/**
 * @route   api/updateAlbumID
 * @desc    search for sub documents which greater than unused ID
            in order to prevent error, index of collection albums's id must start with 0
 * @params  none
 */
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
    ctx.body = {
      code: 200,
      message: ''
    }
  } catch (error) {
    ctx.status = 404
    ctx.body = {
      code: 404,
      message: error.message
    }
  }
})

/**
 * @route   api/renameAlbum
 * @desc    renameAlbum
 * @params  nameOnceUsed, newName
 */

router.post('/renameAlbum', async (ctx) => {
  const {
    nameOnceUsed,
    newName
  } = queryString.parse(ctx.querystring)

  try {
    // rename album from collection albums
    try {
      const res = await album.updateOne({
        'albums.name': {
          $eq: nameOnceUsed
        }
      }, {
        $set: {
          'albums.$.name': newName
        }
      })
      // console.log(res)
    } catch (error) {
      console.error('update collection album failed: \n', error.message)
    }

    // get times
    const times = await compresseds.aggregate([{
      $unwind: "$compresseds"
    }, {
      $match: {
        "compresseds.belongTo": {
          $eq: nameOnceUsed
        }
      }
    }, {
      $project: {
        "albums.id": 1,
      }
    }])

    // modify the relationship between compressed images and album
    try {
      for (let i in times) {
        await compresseds.updateOne({
          'compresseds.belongTo': nameOnceUsed
        }, {
          $set: {
            'compresseds.$.belongTo': newName
          }
        })
      }
      console.log(res)
    } catch (error) {
      console.error('update collection compresseds failed: \n', error.message)
    }

    // modify the relationship between originals images and album
    try {
      for (let i in times) {
        await originals.updateOne({
          'originals.belongTo': {
            $eq: nameOnceUsed
          }
        }, {
          $set: {
            'originals.$.belongTo': newName
          }
        })
      }
    } catch (error) {
      console.error('update collection originals failed: \n', error.message)
    }

    ctx.status = 200
    ctx.body = 1
  } catch (error) {
    ctx.status = 404
    ctx.body = error.message
  }

})

/**
 * @route   api/moveImages
 * @desc    move image(s) to selected album
 * @params  urlString, albumName
 */

router.post('/moveImages', async (ctx) => {
  const {
    urlString,
    albumName
  } = queryString.parse(ctx.querystring)

  const urlArr = urlString.split(',')

  try {
    // modify the relationship between compressed images and album
    try {
      for (let i in urlArr) {
        await compresseds.updateOne({
          'compresseds.url': urlArr[i]
        }, {
          $set: {
            'compresseds.$.belongTo': albumName
          }
        })
      }
    } catch (error) {
      console.error('update collection compresseds failed: \n', error.message)
    }

    // modify the cover of the album which added images
    try {
      const res = await album.updateOne({
        'albums.name': albumName
      }, {
        $set: {
          'albums.$.avatar': urlArr[urlArr.length - 1]
        }
      })
      console.log('res: ', res)
    } catch (error) {
      console.error('modify the cover of the album which added images failed: \n', error.message)
    }

    // modify the relationship between originals images and album
    try {
      for (let i in urlArr) {
        await originals.updateOne({
          'originals.url': `${PATH.ORIGINAL_IMAGE_URL_PREFIX}/${urlArr[i].split('/')[4]}`
        }, {
          $set: {
            'originals.$.belongTo': albumName
          }
        })
      }
    } catch (error) {
      console.error('update collection originals failed: \n', error.message)
    }

    ctx.status = 200
    ctx.body = {
      code: 200,
      message: '移动相片成功!'
    }
  } catch (error) {
    ctx.status = 404
    ctx.body = {
      code: 404,
      message: error.message
    }
  }
})

/**
 * @route   api/getRecommendAlbums
 * @desc    get recommend albums for each years and each cities
 * @params  none
 */

router.get('/getRecommendAlbums', async (ctx) => {
  const result = {
    recommendByPhotographedDay: [],
    recommendByPhotographedPlace: []
  }
  let city = []
  let time = []

  try {
    // get year
    try {
      let timeArr = []
      let tempArr = []

      // get DateTimeOriginal document
      let res = await exifs.findOne({}, {
        '_id': 0,
        'exifs.exifInfo.exif.DateTimeOriginal': 1
      })

      // get sbudocument under exifInfo
      res.exifs.map(element => tempArr.push(element.exifInfo))

      // get sbudocument under exif
      tempArr = tempArr
        .filter(i => i)
        .map(element => element = timeArr.push(element.exif))

      // get an sorted array of year
      timeArr = timeArr
        .map(i => {
          if (i.hasOwnProperty('DateTimeOriginal')) {
            return i.DateTimeOriginal
              .split(' ')[0]
              .split(':')[0]
          }
        })
        .filter(i => i)
        .filter((item, index, self) => self.indexOf(item) === index)
        .sort((a, b) => a - b)

      time = timeArr
    } catch (error) {
      console.log('get photographed year failed: ', error.message)
    }

    const yearTemp = []
    for (let i in time) {
      res = await exifs.aggregate([{
        $unwind: "$exifs"
      }, {
        $match: {
          'exifs.exifInfo.exif.DateTimeOriginal': {
            $regex: eval(`/${time[i]}/g`)
          }
        }
      }, {
        $project: {
          '_id': 0,
          'exifs.belongTo': 1
        }
      }])
      yearTemp.push(res)
    }

    // get recommend by photographed place
    for (let i in yearTemp) {
      let doc = {
        year: time[i],
        url: []
      }
      for (let j in yearTemp[i]) {
        doc.url.push(`${PATH.COMPRESSED_IMAGE_URL_PREFIX}/${yearTemp[i][j].exifs.belongTo}`)
      }
      result.recommendByPhotographedDay.push(doc)
    }

    // -------------------------------------------------------------------- //

    // get photographed place
    try {
      let placeArr = []
      const res = await exifs.findOne({}, {
        'exifs.formattedAddress': 1
      })

      res.exifs.map(element => placeArr.push(element.formattedAddress))

      placeArr = placeArr
        .filter(i => i)
        .map(element => city.push(
          element
          .split('市')[0]
          .split('省')[1] +
          '市'
        ))

      city = city.filter((item, index, self) => {
        return self.indexOf(item) == index
      })
    } catch (error) {
      console.log('get photographed place failed: ', error.message)
    }

    const cityTemp = []
    for (let i in city) {
      res = await exifs.aggregate([{
        $unwind: "$exifs"
      }, {
        $match: {
          'exifs.formattedAddress': {
            $regex: eval(`/${city[i]}/g`)
          }
        }
      }, {
        $project: {
          '_id': 0,
          'exifs.belongTo': 1
        }
      }])
      cityTemp.push(res)
    }

    // get recommend by photographed place
    for (let i in cityTemp) {
      let doc = {
        place: city[i],
        url: []
      }
      for (let j in cityTemp[i]) {
        doc.url.push(`${PATH.COMPRESSED_IMAGE_URL_PREFIX}/${cityTemp[i][j].exifs.belongTo}`)
      }
      result.recommendByPhotographedPlace.push(doc)
    }

    // -------------------------------------------------------------------- //

    ctx.status = 200
    ctx.body = {
      code: 200,
      albums: result
    }
  } catch (error) {
    ctx.status = 400
    ctx.body = {
      code: 400,
      message: '推荐无结果, 请上传图片!',
      err: error.message
    }
  }
})

/**
 * @route   api/modifyAlbumInfo
 * @desc    modify album 's info
   @desc    then use moveImages interface on the client side to move all images
 * @params  albumName, info
 */

router.post('/modifyAlbumInfo', async (ctx) => {
  const {
    albumName,
    info
  } = queryString.parse(ctx.querystring)
  // console.log('info: ', info)
  let infoObj = info
    .split(',')
    .filter(i => i)
    .map(element => {
      const temp = element.split(':')
      const obj = new Object()
      if (temp[0] === 'avatar') {
        const key = temp.shift()
        obj[key] = temp.join(':')
      } else {
        obj[temp[0]] = temp[1]
      }
      return obj
    })
  
  console.log('infoObj: ',infoObj)
  // structure of infoObj: [{key: value}, {key: value}]
  const { status, body } = await new Promise(async (resolve, reject) => {
    // check if name is already exist
    const haveName = await album.findOne({
      albums: {
        $elemMatch: {
          'name': albumName
        }
      }
    })
    if (haveName === null) {
      resolve({
        status: 403,
        body: {
          code: 403,
          message: '相册名已存在'
        }
      })
    } else {
      infoObj.map(i => {
        let temp = undefined
        if (infoObj.length > 1 && infoObj[0].hasOwnProperty('name')) {
          temp = infoObj.shift()
          infoObj.push(temp)
        }
      })
      infoObj.map(async (element) => {
        try {
          await album.updateOne({
            'albums.name': albumName
          }, {
            $set: {
              ['albums.$.' + Object.keys(element).toString()]: Object.values(element).toString()
            }
          })
          resolve({
            status: 200,
            body: {
              code: 200,
              message: '更新成功'
            }
          })
        } catch (error) {
          console.error(error.message)
          reject({
            status: 404,
            body: {
              code: 404,
              message: '更新失败',
              err: error.message
            }
          })
        }
      })
    }
  })

  ctx.status = status
  ctx.body = body
})
module.exports = router