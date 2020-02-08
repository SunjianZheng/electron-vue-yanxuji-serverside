const mongoose = require('mongoose')
mongoose.Promise = global.Promise

const Schema = mongoose.Schema
const ObjectId = mongoose.Types.ObjectId

// Schema
const childSchema = new Schema({
  id: {
    type: Number,
    required: true,
    default: 0
  },
  name: {
    type: String,
    required: true
  },
  avatar: {
    type: String,
    required: true
  },
  describe: {
    type: String,
    required: true
  },
  type: {
    type: String,
    required: true
  },
  createdTime: {
    type: String,
    required: true
  }
})
const albumSchema = new Schema({
  albums: [childSchema]
})

// Model
const albums = mongoose.model('albums', albumSchema)
// const albums = mongoose.model('albums', childSchema)

module.exports = albums