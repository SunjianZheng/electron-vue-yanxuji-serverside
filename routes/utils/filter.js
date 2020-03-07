function filtrateObject(arr, key) {
  console.log(arr)
  return arr.filter(i => i.hasOwnProperty(key))
}

module.exports = filtrateObject