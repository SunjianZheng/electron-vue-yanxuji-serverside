# yanxuji_serverside -- 炎序集服务端



## 序

> 炎序之意为盛夏
>
> 愿沿途风景与我之回忆在盛夏永存



> 炎序集服务端 -- 一个使用`node.js`, `koa2` , `mongoose`, `mongodb`, `exif`  与 `高德地图js API `开发的服务端
>
> 炎序集 -- 一个使用`electron`, `electron-vue` *,* `element-ui`与 高德地图(`vue-amap`) 开发的私人相册
>
> `yanxuji`-- An`electron-vue` photo album project
>
> 
>
> 客户端: https://github.com/SunjianZheng/electron-vue-yanxuji



## Getting started

```shell
# clone the project
git@github.com:SunjianZheng/electron-vue-yanxuji-serverside.git

# enter the project directory
cd yanxuji_serverside

# install dependency
npm install or yarn

# develop
npm run dev
```



## Deployment

```shell
npm run prd
```



## 数据库

- 数据库名: `yanxuji`

### collections

#### albums

```js
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
```



#### compresseds

```js
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
```



#### originals

```js
const childSchema = new Schema({
  belongTo: {
      type: String,
      required: true
    },
  url: String
})

const originalsSchema = new Schema({
  originals: [childSchema]
})
```



#### exifs

```js
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
```





### 存储路径

#### 原图

> `public\originalImg\`

#### 压缩图

> `public\compressedImg\`