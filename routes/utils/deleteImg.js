const fs = require('fs')

function deleteImg(path) {
  if (Array.isArray(path)) {
    try {
      for (let i in path) {
        fs.unlink(path[i], err => {
          if (err) {
            console.error(err.message)
          } else {
            console.log('delete successfuly')
          }
        })
      }
    } catch (error) {
      console.error(error)
    }
  } else {
    try {
      fs.unlink(path, err => {
        if (err) {
          console.error(err.message)
        } else {
          console.log('delete successfuly')
        }
      })
    } catch (error) {
      console.error(error)
    }
  }
}
module.exports = deleteImg