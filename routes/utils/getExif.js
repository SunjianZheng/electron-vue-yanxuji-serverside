const ExifImage = require('exif').ExifImage

async function getExif(path) {
  return new Promise((resolve, reject) => {
      try {
        new ExifImage({
          image: path
        }, (error, exifData) => {
          if (exifData) {
            resolve(exifData)
          } else {
            reject(error)
          }
        })
      } catch (error) {
        reject(error)
      }
    })
    .catch(error => console.error('Could not read exif of image at path: ' + path + '\n  ' + error))
}

module.exports = getExif