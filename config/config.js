/**
 * configurations
 */
module.exports = {
  // dispose of server
  SERVICE: {
    HOST: '',
    PORT: 3000
  },
  // dispose of database
  DATABASE: {
    HOST: 'localhost',
    USER: '',
    PASSWORD: '',
    DATABASE_NAME: 'yanxuji',
    PORT: '27017'
  },
  // dispose of path
  PATH: {
    ORIGINAL_IMAGE_URL_PREFIX: 'http://localhost/originalImg',
    COMPRESSED_IMAGE_URL_PREFIX: 'http://localhost/compressedImg',
    ORIGINAL_IMAGE_STORAGE_PATH: 'public/originalImg',
    COMPRESSED_IMAGE_STORAGE_PATH: 'public/compressedImg'
  },
  AMAP_JS_API_KEY: 'YOUR_KEY',
}