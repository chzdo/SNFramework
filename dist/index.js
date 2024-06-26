"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _index = _interopRequireDefault(require("./controllers/index.js"));
var _mg = _interopRequireDefault(require("./controllers/mg.js"));
var _index2 = _interopRequireDefault(require("./utils/index.js"));
var _mailers = _interopRequireDefault(require("./controllers/mailers.js"));
var _files = _interopRequireDefault(require("./controllers/files.js"));
var _messageQueue = _interopRequireDefault(require("./controllers/message-queue.js"));
var _export = _interopRequireDefault(require("./controllers/export.js"));
var _auth = _interopRequireDefault(require("./controllers/auth.js"));
var _myxalary = _interopRequireDefault(require("./controllers/myxalary.js"));
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }
class framework {
  utils = _index2.default;
  static utils = _index2.default;
  modelInstance;
  MessageQueue = _messageQueue.default;
  appAuth = _auth.default;
  myxalary = _myxalary.default;
  constructor() {}
  setMG({
    url,
    models = [],
    sshCredentials = null
  }) {
    if (!url) {
      throw new Error(`mongo db url not defined`);
    }
    if (!models) {
      throw new Error(`models not defined`);
    }
    this.mg = new _mg.default({
      url,
      sshCredentials,
      models
    });
    this.mg.setupModels();
    this.modelInstance = this.mg;
    return this;
  }
  createController({
    name,
    model,
    validations = {},
    callback = {},
    populateOptions = [],
    flat = false,
    defaultSort = {},
    middlewareVariables = {
      where: "",
      create: {},
      query: {}
    },
    ...rest
  }) {
    if (!(name && model && validations)) {
      throw new Error(`incomplete parameters`);
    }
    return new _index.default({
      model,
      controller: name,
      validations,
      callback,
      populateOptions,
      flat,
      defaultSort,
      middlewareVariables,
      modelInstance: this.modelInstance,
      ...rest
    });
    // return this]];
  }

  static setMailer({
    KEY,
    DOMAIN,
    FROM,
    HOST,
    PORT,
    AUTH,
    useHandleBars
  }) {
    if (!(KEY && DOMAIN || HOST && PORT && AUTH)) {
      throw Error(`mail credentials not set`);
    }
    return new _mailers.default({
      KEY,
      DOMAIN,
      FROM,
      HOST,
      PORT,
      AUTH,
      useHandleBars
    });
  }
  fileUploader() {
    return _files.default;
  }
  export({
    config,
    reportType,
    title,
    stream,
    fileName,
    sheets,
    settings,
    returnBuffer
  }) {
    if (!reportType) {
      throw new Error('Set Export Type');
    }
    return (0, _export.default)({
      config,
      reportType,
      title,
      fileName,
      stream,
      sheets,
      settings,
      returnBuffer
    });
  }
}
var _default = framework;
exports.default = _default;