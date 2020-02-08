const mongoose = require('mongoose').set('debug', true)
const options = {
  autoReconnect: true,
  useNewUrlParser: true,
  useUnifiedTopology: true
}
const {
  DATABASE
} = require('../config/config')

const url = `mongodb://${DATABASE.HOST}:${DATABASE.PORT}/${DATABASE.DATABASE_NAME}`

module.exports = {
  connect: () => {
    mongoose.connect(url, options)
    let db = mongoose.connection
    db.on('error', console.error.bind(console, 'ERROR: '))
    db.once('open', () => {
      console.log('mongoDB connect suucessed')
    })
  }
}