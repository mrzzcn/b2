const path = require('path')
const fs = require('fs')
const { promisify } = require('util')
const crypto = require('crypto')

const B2 = require('backblaze-b2')
const readFile = promisify(fs.readFile)

async function upload (config, file) {
  const b2 = new B2({
    applicationKeyId: config.keyId,
    applicationKey: config.applicationKey
  })
  if (config.debug) {
    console.log('Upload Start', file);
  }
  const authRes = await b2.authorize()
  if (config.debug) {
    console.log('Authorize Response', authRes.status, authRes.data);
  }
  if (authRes.status !== 200)
    throw authRes.data
  const { downloadUrl, allowed } = authRes.data
  const bucket = Array.isArray(allowed) ? allowed.find(b => b.bucketId === config.bucketId) : allowed

  const urlRes = await b2.getUploadUrl(bucket.bucketId)
  if (urlRes.status !== 200)
    throw urlRes.data
  if (config.debug) {
    console.log('Get Upload Url Response', urlRes.status, urlRes.data)
  }
  const { uploadUrl, authorizationToken } = urlRes.data
  const fileData = await readFile(file)
  if (config.debug) {
    console.log('fileData', fileData);
  }
  const hash = crypto.createHash('sha1')
  hash.update(fileData)
  const sha1 = hash.digest('hex')
  if (config.debug) {
    console.log('sha1', sha1);
  }
  const uploadRes = await b2.uploadFile({
    uploadUrl,
    uploadAuthToken: authorizationToken,
    fileName: path.basename(file),
    data: fileData,
    hash: sha1,
    info: {
      author: 'Jack',
    }
  })
  if (uploadRes.status !== 200)
    throw uploadRes.data
  if (config.debug) {
    console.log('Upload Response', uploadRes.status, uploadRes.data)
  }
  const { fileName } = uploadRes.data
  const pathname = `/file/${bucket.bucketName}/${fileName}`
  return {
    origin: downloadUrl,
    bucket: bucket.bucketName,
    fileName,
    pathname,
    url: `${downloadUrl}${pathname}`
  }
}
module.exports = upload