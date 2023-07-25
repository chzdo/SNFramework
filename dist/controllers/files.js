"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _express = _interopRequireDefault(require("express"));
var _expressFileupload = _interopRequireDefault(require("express-fileupload"));
var _cloudinary = _interopRequireDefault(require("cloudinary"));
var _streamifier = _interopRequireDefault(require("streamifier"));
var _storageBlob = require("@azure/storage-blob");
var _index = _interopRequireDefault(require("../utils/index.js"));
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }
const Router = _express.default.Router();
let azure;
const cloudUpload = function (file) {
  let resource_type = 'raw';
  if (file.mimetype.includes("image") || file.mimetype.includes("video")) {
    resource_type = 'auto';
  }
  return new Promise((resolve, reject) => {
    const stream = _cloudinary.default.v2.uploader.upload_stream({
      folder: UploadFile.folder,
      resource_type
    }, function (error, result) {
      if (error) {
        reject(error);
        return;
      }
      resolve({
        ...result
      });
    });
    _streamifier.default.createReadStream(file.data).pipe(stream);
  });
};
const azureUpload = async function (file) {
  const regex = /(.([a-z]+))$/gmi.exec(file.name);
  const uploadPath = `${UploadFile.folder}/${file.name}`;
  // create blobClient for container
  const blobClient = azure.getBlockBlobClient(uploadPath);

  // set mimetype as determined from browser with file upload control
  const options = {
    blobHTTPHeaders: {
      blobContentType: file.mimetype
    }
  };
  // upload file
  await blobClient.uploadData(file.data, options);
  return {
    url: blobClient.url,
    type: file.mimetype,
    format: regex[2],
    secure_url: blobClient.url,
    filePath: uploadPath
  };
};
const uploadFile = _index.default.wrapper(async (req, res) => {
  try {
    const files = req.files;
    if (!files) {
      return {
        code: 400,
        data: {
          error: `Please attach a file`
        }
      };
    }
    let uploaded = {};
    for (let file in files) {
      let fileObj = files[file];
      if (Array.isArray(fileObj)) {
        fileObj = fileObj.map(async file => {
          return await UploadFile.selectedService(file);
        });
      } else {
        fileObj = UploadFile.selectedService(fileObj);
      }
      uploaded[file] = await (Array.isArray(fileObj) ? Promise.all(fileObj) : fileObj);
    }
    return {
      code: 201,
      data: {
        data: uploaded
      }
    };
  } catch (error) {
    console.log(error);
    return {
      code: 500,
      data: {
        error: "server error"
      }
    };
  }
});
const UploadFile = {
  selectedService: null,
  folder: null,
  setup: function ({
    type = _index.default.FILE_TYPES.AZURE,
    options,
    folder = 'my_folder'
  }) {
    this.folder = folder;
    if (type === _index.default.FILE_TYPES.CLOUDINARY) {
      _cloudinary.default.config(options);
      this.selectedService = cloudUpload;
    } else {
      azure = new _storageBlob.BlobServiceClient(options.url).getContainerClient(options.container);
      this.selectedService = azureUpload;
    }
    return this;
  },
  addUploadFileRoute() {
    Router.post("/files", [(0, _expressFileupload.default)({})], uploadFile);
    return Router;
  }
};
var _default = UploadFile;
exports.default = _default;