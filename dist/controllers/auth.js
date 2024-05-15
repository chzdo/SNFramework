"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _httpErrors = require("../utils/http-errors.js");
var _index = _interopRequireDefault(require("../utils/index.js"));
var _dotenv = _interopRequireDefault(require("dotenv"));
var _db = _interopRequireDefault(require("../utils/db.js"));
var _jsonwebtoken = _interopRequireDefault(require("jsonwebtoken"));
var _mongoose = require("mongoose");
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }
_dotenv.default.config();
const {
  NOT_AUTHORIZED,
  FORBIDDEN
} = _httpErrors.codes;
const key = process.env.JWT_SECRET_KEY;
const handleAdminAuth = async ({
  token = '',
  employeeID,
  companyID
}) => {
  const tokenS = token?.split(" ")[1];
  const decoded = _jsonwebtoken.default.verify(tokenS, key);
  let user = await _db.default.Users.findOne({
    _id: new _mongoose.Types.ObjectId(decoded._id),
    "tokens.token": tokenS
  }, {
    projection: {
      password: 0
    }
  });
  if (!user) {
    throw new Error("No Active Account");
  }
  user = checkActiveCompanies(user, true);
  if (!user) {
    throw new Error("No Active Account");
  }
  user.companyData = await _db.default.Company.findOne({
    _id: new _mongoose.Types.ObjectId(user.companyID)
  });
  const role = await _db.default.Role.findOne({
    roleName: user.userRole,
    companyID: user.companyID
  });
  user.permissions = role.permissions;
  return user;
};
const handleEmployeeAuth = async ({
  token = '',
  employeeID,
  companyID
}) => {
  const tokenS = token?.split(" ")[1];
  const decoded = _jsonwebtoken.default.verify(tokenS, key);
  let [employee] = await _db.default.Employee.aggregate([{
    $match: {
      _id: new _mongoose.Types.ObjectId(decoded._id),
      "tokens.token": tokenS,
      isActive: true
    }
  }, {
    $sort: {
      createdAt: -1
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
      from: "employeecadresteps",
      localField: "employeeCadreStep",
      foreignField: "_id",
      as: "employeeCadreStep"
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
      from: "departments",
      localField: "departmentID",
      foreignField: "_id",
      as: "departmentID"
    }
  }, {
    $lookup: {
      from: "companies",
      localField: "companyID",
      foreignField: "_id",
      as: "companyID"
    }
  }, {
    $lookup: {
      from: "teams",
      localField: "teamID",
      foreignField: "_id",
      as: "teamID"
    }
  }, {
    $lookup: {
      from: "leavecategories",
      localField: "leaveCategory",
      foreignField: "_id",
      as: "leaveCategory"
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
      from: "employees",
      let: {
        id: "$employeeManager"
      },
      pipeline: [{
        $match: {
          $expr: {
            $and: [{
              $eq: ["$_id", "$$id"]
            }, {
              isActive: true
            }, {
              $or: [{
                $eq: ["$termination", null]
              }, {
                $eq: ["$termination.status", false]
              }]
            }]
          }
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
          from: "branches",
          localField: "branchID",
          foreignField: "_id",
          as: "branchID"
        }
      }, {
        $addFields: {
          employeeCadre: {
            $arrayElemAt: ["$employeeCadre", 0]
          },
          departmentID: {
            $arrayElemAt: ["$departmentID", 0]
          },
          branchID: {
            $arrayElemAt: ["$branchID", 0]
          }
        }
      }, {
        $project: {
          firstName: 1,
          lastName: 1,
          myx3ID: 1,
          employeeEmail: 1,
          profileImgUrl: 1,
          employeeCadre: 1,
          departmentID: 1,
          branchID: 1
        }
      }],
      as: "employeeManager"
    }
  }, {
    $unwind: {
      path: "$employeeSubordinates",
      preserveNullAndEmptyArrays: true
    }
  }, {
    $lookup: {
      from: "licensev2",
      let: {
        lid: "$companyLicense.licenseId"
      },
      pipeline: [{
        $match: {
          $expr: {
            $eq: ["$_id", "$$lid"]
          }
        }
      }, {
        $addFields: {
          licensePackageID: {
            $toObjectId: "$licensePackageID"
          }
        }
      }, {
        $lookup: {
          from: "licenselists",
          localField: "licensePackageID",
          foreignField: "_id",
          as: "licensePackageID"
        }
      }, {
        $unwind: "$licensePackageID"
      }, {
        $project: {
          "licensePackageID.modules": 1,
          "licensePackageID._id": 1,
          "name": 1,
          "currentExpiry": 1
        }
      }],
      as: "companyLicense2"
    }
  }, {
    $unwind:
    /**
     * path: Path to the array field.
     * includeArrayIndex: Optional name for index.
     * preserveNullAndEmptyArrays: Optional
     *   toggle to unwind null and empty values.
     */
    {
      path: "$mentees",
      preserveNullAndEmptyArrays: true
    }
  }, {
    $lookup:
    /**
     * from: The target collection.
     * localField: The local join field.
     * foreignField: The target join field.
     * as: The name for the results.
     * pipeline: Optional pipeline to run on the foreign collection.
     * let: Optional variables to use in the pipeline field stages.
     */
    {
      from: "employees",
      let: {
        id: "$mentees"
      },
      pipeline: [{
        $match: {
          $expr: {
            $and: [{
              $eq: ["$_id", "$$id"]
            }, {
              isActive: true
            }, {
              $or: [{
                $eq: ["$termination", null]
              }, {
                $eq: ["$termination.status", false]
              }]
            }]
          }
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
          from: "branches",
          localField: "branchID",
          foreignField: "_id",
          as: "branchID"
        }
      }, {
        $addFields: {
          employeeCadre: {
            $arrayElemAt: ["$employeeCadre", 0]
          },
          departmentID: {
            $arrayElemAt: ["$departmentID", 0]
          },
          branchID: {
            $arrayElemAt: ["$branchID", 0]
          }
        }
      }, {
        $project: {
          firstName: 1,
          lastName: 1,
          myx3ID: 1,
          employeeEmail: 1,
          profileImgUrl: 1,
          employeeCadre: 1,
          departmentID: 1,
          branchID: 1
        }
      }],
      as: "mentees"
    }
  }, {
    $lookup: {
      from: "employees",
      let: {
        id: "$employeeSubordinates"
      },
      pipeline: [{
        $match: {
          $expr: {
            $and: [{
              $eq: ["$_id", "$$id"]
            }, {
              isActive: true
            }, {
              $or: [{
                $eq: ["$termination", null]
              }, {
                $eq: ["$termination.status", false]
              }]
            }]
          }
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
          from: "branches",
          localField: "branchID",
          foreignField: "_id",
          as: "branchID"
        }
      }, {
        $addFields: {
          employeeCadre: {
            $arrayElemAt: ["$employeeCadre", 0]
          },
          departmentID: {
            $arrayElemAt: ["$departmentID", 0]
          },
          branchID: {
            $arrayElemAt: ["$branchID", 0]
          }
        }
      }, {
        $project: {
          firstName: 1,
          lastName: 1,
          myx3ID: 1,
          employeeEmail: 1,
          profileImgUrl: 1,
          employeeCadre: 1,
          departmentID: 1,
          branchID: 1
        }
      }],
      as: "employeeSubordinates"
    }
  }, {
    $addFields: {
      employeeSubordinates: {
        $arrayElemAt: ["$employeeSubordinates", 0]
      }
    }
  }, {
    $addFields:
    /**
     * newField: The new field name.
     * expression: The new field expression.
     */
    {
      mentees: {
        $arrayElemAt: ["$mentees", 0]
      }
    }
  }, {
    $group: {
      _id: "$_id",
      main: {
        $first: "$$CURRENT"
      },
      employeeSubordinates: {
        $push: "$employeeSubordinates"
      },
      mentees: {
        $addToSet: "$mentees"
      }
    }
  }, {
    $addFields: {
      "main.employeeSubordinates": "$employeeSubordinates",
      "main.mentees": "$mentees"
    }
  }, {
    $replaceRoot: {
      newRoot: "$main"
    }
  }, {
    $sort: {
      createdAt: -1
    }
  }, {
    $addFields: {
      employeeCadre: {
        $arrayElemAt: ["$employeeCadre", 0]
      },
      companyID: {
        $arrayElemAt: ["$companyID", 0]
      },
      employeeCadreStep: {
        $arrayElemAt: ["$employeeCadre", 0]
      },
      branchID: {
        $arrayElemAt: ["$branchID", 0]
      },
      departmentID: {
        $arrayElemAt: ["$departmentID", 0]
      },
      teamID: {
        $arrayElemAt: ["$teamID", 0]
      },
      leaveCategory: {
        $arrayElemAt: ["$leaveCategory", 0]
      },
      salaryScheme: {
        $arrayElemAt: ["$salaryScheme", 0]
      },
      employeeManager: {
        $arrayElemAt: ["$employeeManager", 0]
      },
      "companyLicense.licenseId": {
        $arrayElemAt: ["$companyLicense2", 0]
      }
    }
  }]).toArray();
  if (!employee) {
    throw new Error("Employee not found");
  }
  delete employee.tokens;
  delete employee.password;
  return employee;
};
async function handleFinratusAuth({
  AUTH_URL,
  token,
  employeeID
}) {
  const result = await _index.default.request.get({
    url: AUTH_URL,
    headers: {
      authorization: token
    }
  });
  let {
    data,
    success
  } = result;
  if (!success) {
    throw new Error("network error");
  }
  data = data?.data || data?.response || data;
  if (data?.myxalary?.employees) {
    data = data.myxalary.employees.find(employee => employee._id === employeeID);
  }
  if (!data) {
    return res.status(NOT_AUTHORIZED.CODE).json({
      code: NOT_AUTHORIZED.CODE,
      statusCode: NOT_AUTHORIZED.CODE,
      error: NOT_AUTHORIZED.MESSAGE
    });
  }
  return data;
}
function addUserToRequest(data, {
  employeeID,
  token,
  isEmployee,
  companyID,
  myxalaryEmployee,
  isMobileClient
}) {
  return JSON.parse(JSON.stringify({
    ...data,
    userRole: data.userRole || 'employee',
    userId: employeeID || data._id,
    firstName: data.firstName,
    lastName: data.lastName,
    fullName: data.fullname || `${data.firstName} ${data.lastName}`,
    isAdmin: !isEmployee,
    companyID: companyID || data.companyID._id || data.companyID,
    fid: data.myx3ID,
    email: data.employeeEmail || data.userEmail,
    profileImgUrl: data.profileImgUrl || data.imageUrl,
    permissions: data.permissions,
    isEmployee,
    companyData: data.companyData || data.companyID,
    isManager: data.employeeSubordinates?.length > 0,
    subordinates: data.employeeSubordinates,
    mentees: data.mentees,
    isMentor: !!data.mentees?.length,
    manager: data.employeeManager,
    myxalaryEmployee,
    isMobileClient,
    token
  }));
}
function checkActiveCompanies(user) {
  const companyID = `${user.companyData?._id || user.companyID}`;
  const currentCompany = user.companies.find(v => {
    return `${v.companyID}` == companyID;
  });
  if (!currentCompany?.isActive) {
    return null;
  }
  return user;
}
function authV2({
  finratusAPI
}) {
  return async (req, res, next) => {
    try {
      const authorization = req.headers.authorization;
      const myxalaryAuthorization = req.headers.myxalaryauthorization;
      const myxalaryEmployee = !!myxalaryAuthorization;
      const token = myxalaryAuthorization || authorization;
      const employeeID = req.headers.employeeid;
      const companyID = req.headers.companyid;
      if (!token) {
        return res.status(NOT_AUTHORIZED.CODE).json({
          code: NOT_AUTHORIZED.CODE,
          statusCode: NOT_AUTHORIZED.CODE,
          error: NOT_AUTHORIZED.MESSAGE
        });
      }
      const handler = myxalaryEmployee ? handleEmployeeAuth : !employeeID ? handleAdminAuth : handleFinratusAuth;
      const user = await handler({
        token,
        employeeID,
        companyID,
        AUTH_URL: finratusAPI
      });
      const isEmployee = myxalaryEmployee || employeeID;
      req.token = token;
      req.user = addUserToRequest(user, {
        token,
        companyID,
        employeeID,
        isEmployee,
        myxalaryEmployee,
        isMobileClient: !!(!myxalaryEmployee && employeeID)
      });
      req.isAdmin = !isEmployee;
      req.company = user.companyData;
      next();
    } catch (e) {
      console.log(e);
      return res.status(NOT_AUTHORIZED.CODE).json({
        code: NOT_AUTHORIZED.CODE,
        statusCode: NOT_AUTHORIZED.CODE,
        error: NOT_AUTHORIZED.MESSAGE
      });
    }
  };
}
function authV1({
  finratusAPI,
  mxUserAPI,
  mxEmployeeAPI
}) {
  return async (req, res, next) => {
    const authorization = req.headers.authorization;
    const myxalaryAuthorization = req.headers.myxalaryauthorization;
    const myxalaryEmployee = !!myxalaryAuthorization;
    const token = authorization || myxalaryAuthorization;
    const employeeID = req.headers.employeeid;
    const companyID = req.headers.companyid;
    if (!token) {
      return res.status(NOT_AUTHORIZED.CODE).json({
        code: NOT_AUTHORIZED.CODE,
        statusCode: NOT_AUTHORIZED.CODE,
        error: NOT_AUTHORIZED.MESSAGE
      });
    }
    const AUTH_URL = myxalaryEmployee ? mxEmployeeAPI : !employeeID ? mxUserAPI : finratusAPI;
    const result = await _index.default.request.get({
      url: AUTH_URL,
      headers: {
        authorization,
        myxalaryAuthorization
      }
    });
    let {
      data,
      success
    } = result;
    if (!success) {
      return res.status(NOT_AUTHORIZED.CODE).json({
        code: NOT_AUTHORIZED.CODE,
        statusCode: NOT_AUTHORIZED.CODE,
        error: NOT_AUTHORIZED.MESSAGE
      });
    }
    data = data?.data || data?.response || data;
    if (data?.myxalary?.employees) {
      data = data.myxalary.employees.find(employee => employee._id === employeeID);
    }
    if (!data) {
      return res.status(NOT_AUTHORIZED.CODE).json({
        code: NOT_AUTHORIZED.CODE,
        statusCode: NOT_AUTHORIZED.CODE,
        error: NOT_AUTHORIZED.MESSAGE
      });
    }
    const isEmployee = !!employeeID || myxalaryEmployee;
    req.user = {
      ...data,
      userRole: data.userRole || 'employee',
      userId: employeeID || data._id,
      firstName: data.firstName,
      lastName: data.lastName,
      fullName: data.fullname || `${data.firstName} ${data.lastName}`,
      isAdmin: !isEmployee,
      companyID: companyID || data.companyID._id || data.companyID,
      fid: data.myx3ID,
      email: data.employeeEmail || data.userEmail,
      profileImgUrl: data.profileImgUrl || data.imageUrl,
      permissions: data.permissions,
      isEmployee,
      companyData: data.companyData || data.companyID,
      isManager: data.employeeSubordinates?.length > 0,
      subordinates: data.employeeSubordinates,
      manager: data.employeeManager,
      myxalaryEmployee,
      isMobileClient: AUTH_URL === finratusAPI,
      token
    };
    req.company = data.companyData || data.companyID;
    next();
  };
}
const Authentication_Authorization = {
  setup({
    finratusAPI,
    mxUserAPI,
    mxEmployeeAPI
  }) {
    return {
      auth: process.env.AUTH_VERSION === 1 ? authV1({
        finratusAPI,
        mxUserAPI,
        mxEmployeeAPI
      }) : authV2({
        finratusAPI,
        mxUserAPI,
        mxEmployeeAPI
      }),
      isEmployee: async function (req, res, next) {
        if (!req.user.isEmployee) {
          return res.status(FORBIDDEN.CODE).json({
            code: FORBIDDEN.CODE,
            statusCode: FORBIDDEN.CODE,
            error: FORBIDDEN.MESSAGE
          });
        }
        next();
      },
      setLicense: module => {
        if (!module) throw new Error("Set License");
        return (req, res, next) => {
          req.license = module;
          next();
        };
      },
      isAdmin: async function (req, res, next) {
        if (!req.user.isAdmin) {
          return res.status(FORBIDDEN.CODE).json({
            code: FORBIDDEN.CODE,
            statusCode: FORBIDDEN.CODE,
            error: FORBIDDEN.MESSAGE
          });
        }
        next();
      },
      isSupervisor: async function (req, res, next) {
        if (!req.user.subordinates?.length) {
          return res.status(FORBIDDEN.CODE).json({
            code: FORBIDDEN.CODE,
            statusCode: FORBIDDEN.CODE,
            error: FORBIDDEN.MESSAGE
          });
        }
        next();
      },
      isMobileClient: async function (req, res, next) {
        if (!req.user.isMobileClient) {
          return res.status(FORBIDDEN.CODE).json({
            code: FORBIDDEN.CODE,
            statusCode: FORBIDDEN.CODE,
            error: FORBIDDEN.MESSAGE
          });
        }
        next();
      },
      isSupervisorOrAdmin: async function (req, res, next) {
        const {
          isManager,
          isAdmin
        } = req.user;
        if (!(isManager || isAdmin)) {
          return res.status(FORBIDDEN.CODE).json({
            code: FORBIDDEN.CODE,
            statusCode: FORBIDDEN.CODE,
            error: FORBIDDEN.MESSAGE
          });
        }
        next();
      },
      isMentor: async function (req, res, next) {
        const {
          isMentor
        } = req.user;
        if (!isMentor) {
          return res.status(FORBIDDEN.CODE).json({
            code: FORBIDDEN.CODE,
            statusCode: FORBIDDEN.CODE,
            error: FORBIDDEN.MESSAGE
          });
        }
        next();
      },
      isSupervisorOrIsMentor: async function (req, res, next) {
        const {
          isManager,
          isMentor
        } = req.user;
        if (!(isManager || isMentor)) {
          return res.status(FORBIDDEN.CODE).json({
            code: FORBIDDEN.CODE,
            statusCode: FORBIDDEN.CODE,
            error: FORBIDDEN.MESSAGE
          });
        }
        next();
      },
      isSupervisorOrIsMentorOrIsAdmin: async function (req, res, next) {
        const {
          isManager,
          isMentor,
          isAdmin
        } = req.user;
        if (!(isManager || isMentor || isAdmin)) {
          return res.status(FORBIDDEN.CODE).json({
            code: FORBIDDEN.CODE,
            statusCode: FORBIDDEN.CODE,
            error: FORBIDDEN.MESSAGE
          });
        }
        next();
      },
      hasLicense: async function (req, res, next) {
        if (!req.user.isEmployee) return next();
        if (!req.user?.companyLicense?.licenseId?.licensePackageID?.modules) {
          return res.status(FORBIDDEN.CODE).json({
            code: FORBIDDEN.CODE,
            statusCode: FORBIDDEN.CODE,
            error: `No License Found`
          });
        }
        const modules = req.user.companyLicense.licenseId.licensePackageID.modules;
        if (!modules[req.license]) {
          return res.status(FORBIDDEN.CODE).json({
            code: FORBIDDEN.CODE,
            statusCode: FORBIDDEN.CODE,
            error: `No License Found For ${req.license}`
          });
        }
        next();
      }
    };
  }
};
var _default = Authentication_Authorization;
exports.default = _default;