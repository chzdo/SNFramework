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
  },
  getMyxalaryEmployees: async (companyID, query) => {
    const users = await _db.default.Employee.aggregate([{
      $match:
      /**
       * query: The query in MQL.
       */
      {
        companyID: new _mongoose.Types.ObjectId(companyID),
        ...query
      }
    }, {
      $project: {
        firstName: 1,
        fullName: {
          $concat: ["$firstName", " ", "$lastName"]
        },
        lastName: 1,
        jobRole: 1,
        branchID: 1,
        employeeCadre: 1,
        employeeCadreStep: 1,
        salaryScheme: 1,
        departmentID: 1,
        branchID: 1,
        companyID: 1,
        employeeEmail: 1,
        profileImgUrl: 1,
        isAdmin: 1,
        myx3ID: 1,
        gender: 1,
        teamID: 1
      }
    }, {
      $sort: {
        fullName: -1
      }
    }, {
      $lookup: {
        from: "branches",
        localField: "branchID",
        foreignField: "_id",
        as: "branchID"
      }
    }, {
      $lookup: {
        from: "salaryschemes",
        localField: "salaryScheme",
        foreignField: "_id",
        as: "salaryScheme"
      }
    }, {
      $lookup: {
        from: "employeecadres",
        localField: "employeeCadre",
        foreignField: "_id",
        as: "employeeCadre"
      }
    }, {
      $lookup: {
        from: "departments",
        localField: "departmentID",
        foreignField: "_id",
        as: "departmentID"
      }
    }, {
      $lookup: {
        from: "employeecadresteps",
        localField: "employeeCadreStep",
        foreignField: "_id",
        as: "employeeCadreStep"
      }
    }, {
      $addFields: {
        employeeCadreStep: {
          $arrayElemAt: ["$employeeCadreStep", 0]
        },
        departmentID: {
          $arrayElemAt: ["$departmentID", 0]
        },
        branchID: {
          $arrayElemAt: ["$branchID", 0]
        },
        employeeCadre: {
          $arrayElemAt: ["$employeeCadre", 0]
        },
        salaryScheme: {
          $arrayElemAt: ["$salaryScheme", 0]
        }
      }
    }]).toArray();
    return users;
  }
};
var _default = myxalaryController;
exports.default = _default;