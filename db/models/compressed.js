const mongoose = require('mongoose')
mongoose.Promise = global.Promise

const Schema = mongoose.Schema
const ObjectId = mongoose.Types.ObjectId

const childSchema = new Schema({
  belongTo: {
    type: String,
    required: true
  },
  url: String
})

const compressedSchema = new Schema({
  compresseds: [childSchema]
})

// Model
const compresseds = mongoose.model('compresseds', compressedSchema)

module.exports = compresseds