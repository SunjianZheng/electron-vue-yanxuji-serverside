const mongoose = require('mongoose')
mongoose.Promise = global.Promise

const Schema = mongoose.Schema
const ObjectId = mongoose.Types.ObjectId

const childSchema = new Schema({
  belongTo: {
    type: String,
    required: true
  },
  exifInfo: {
    type: Object,
    required: true
  },
  coor: {
    type: String,
    required: true
  },
  formattedAddress: {
    type: String,
    required: true
  }
})

const exifsSchema = new Schema({
  exifs: [childSchema]
})

// Model
const exifs = mongoose.model('exifs', exifsSchema)

module.exports = exifs