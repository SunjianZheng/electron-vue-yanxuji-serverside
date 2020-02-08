const koa2Req = require('koa2-request')
const {
  AMAP_JS_API_KEY
} = require('../../config/config')

function getGpsCoor(gpsInfo) {
  const LatitudeArary = gpsInfo.GPSLatitude
  const LongitudeArray = gpsInfo.GPSLongitude
  const loc = {
    Longitude: Number,
    Latitude: Number
  }

  if (LongitudeArray) {
    const longLongitude = (LongitudeArray[0]) + (LongitudeArray[1] / 60) + (LongitudeArray[2] / 3600)
    loc.Longitude = longLongitude.toFixed(6)
  }

  if (LatitudeArary) {
    const longLatitude = (LatitudeArary[0]) + (LatitudeArary[1] / 60) + (LatitudeArary[2] / 3600)
    loc.Latitude = longLatitude.toFixed(6)
  }

  return loc
}
async function getTransLoc(gpsInfo) {
  const gpsCoor = await getGpsCoor(gpsInfo)
  const loc = {
    Longitude: Number,
    Latitude: Number
  }
  loc.Longitude = parseFloat(gpsCoor.Longitude)
  loc.Latitude = parseFloat(gpsCoor.Latitude)
  const res = await koa2Req(`https://restapi.amap.com/v3/assistant/coordinate/convert?key=${AMAP_JS_API_KEY}&locations=${loc.Longitude},${loc.Latitude}&coordsys=gps`);
  const transLoc = JSON.parse(res.body).locations
  console.log(transLoc)
  return transLoc
}

async function getAddr(gpsInfo) {
  const transLoc = await getTransLoc(gpsInfo)
  const coor = {
    Longitude: Number,
    Latitude: Number
  }

  coor.Longitude = transLoc.split(',')[0]
  coor.Latitude = transLoc.split(',')[1]

  const res = await koa2Req(`https://restapi.amap.com/v3/geocode/regeo?output=JSON&location=${coor.Longitude},${coor.Latitude}&key=${AMAP_JS_API_KEY}&radius=1000&extensions=all`)
  const addr = JSON.parse(res.body).regeocode.formatted_address
  const result = {
    coor: Object,
    addr: Object
  }
  result.coor = transLoc
  result.addr = addr

  return result
}

module.exports = getAddr