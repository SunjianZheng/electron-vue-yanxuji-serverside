const mongoose = require('mongoose')
mongoose.Promise = global.Promise

const Schema = mongoose.Schema
const ObjectId = mongoose.Types.ObjectId

// Schema
// const childChildSchema = new Schema({
//   url: ''
//   // {
//   //   type: String,
//   //   required: true
//   // }
// })
const childSchema = new Schema({
  belongTo: {
      type: String,
      required: true
    },
  url: String
})
// const childSchema = new Schema({
//   belongTo: {
//     type: String,
//     required: true
//   },
//   url: Array
// })
const originalsSchema = new Schema({
  originals: [childSchema]
})

// Model
const originals = mongoose.model('originals', originalsSchema)

module.exports = originals