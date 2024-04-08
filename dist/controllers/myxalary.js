"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _mongoose = require("mongoose");
var _db = _interopRequireDefault(require("../utils/db.js"));
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }
const myxalaryController = {
  getMyxalaryUsers: async companyID => {
    const users = await _db.default.Users.aggregate([{
      $match:
      /**
       * query: The query in MQL.
       */
      {
        companies: {
          $elemMatch: {
            companyID: new _mongoose.Types.ObjectId(companyID),
            isActive: true
          }
        }
      }
    }, {
      $unwind: {
        path: "$companies"
      }
    }, {
      $match: {
        "companies.companyID": new _mongoose.Types.ObjectId(companyID)
      }
    }, {
      $lookup: {
        from: "roles",
        let: {
          userRole: "$userRole"
        },
        pipeline: [{
          $match: {
            $expr: {
              $and: [{
                $eq: ["$roleName", "$$userRole"]
              }, {
                $eq: ["$companyID", new _mongoose.Types.ObjectId(companyID)]
              }]
            }
          }
        }, {
          $project: {
            roleName: 1,
            permissions: 1
          }
        }],
        as: "role"
      }
    }, {
      $unwind: {
        path: "$role"
      }
    }, {
      $project: {
        fullName: {
          $concat: ["$firstName", " ", "$lastName"]
        },
        firstName: 1,
        lastName: 1,
        userEmail: 1,
        profileImgUrl: 1,
        isAdmin: true,
        role: 1,
        phone: 1
      }
    }]).toArray();
    return users;
  }
};
var _default = myxalaryController;
exports.default = _default;