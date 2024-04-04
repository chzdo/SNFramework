"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _mongodb = require("mongodb");
var _dotenv = _interopRequireDefault(require("dotenv"));
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }
_dotenv.default.config();
const dbUrl = process.env.AUTH_DB;
let db;
try {
  db = new _mongodb.MongoClient(dbUrl);
} catch (e) {
  console.warn("auth db not specified - ignore if you do not intend to use the auth");
}
const dbName = 'myxalary';
class DB {
  #db;
  constructor() {
    if (db) {
      this.#connect();
    }
  }
  async #connect() {
    await db.connect();
    this.#db = db.db(dbName);
  }
  get Users() {
    return this.#db.collection('users');
  }
  get Company() {
    return this.#db.collection('companies');
  }
  get Employee() {
    return this.#db.collection('employees');
  }
  get Role() {
    return this.#db.collection('roles');
  }
}
var _default = new DB();
exports.default = _default;