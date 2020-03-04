function findUunusedID(arr) {
  let missingNum = 0;
  for (let i in arr) {
    missingNum = missingNum ^ i ^ arr[i];
  }
  return missingNum ^ arr.length;
}

module.exports = findUunusedID
