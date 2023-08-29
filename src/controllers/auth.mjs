
import { codes } from "../utils/http-errors.mjs";
import utils from "../utils/index.mjs";
const { NOT_AUTHORIZED, FORBIDDEN } = codes;

const Authentication_Authorization = {
    setup({ finratusAPI, mxUserAPI, mxEmployeeAPI }) {
        return {
            auth: async function (req, res, next) {
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
                    })
                }
                const AUTH_URL = myxalaryEmployee ? mxEmployeeAPI : (!employeeID ? mxUserAPI : finratusAPI)

                const result = await utils.request.get({ url: AUTH_URL, headers: { authorization, myxalaryAuthorization } });
                let { data, success } = result;
                if (!success) {
                    return res.status(NOT_AUTHORIZED.CODE).json({
                        code: NOT_AUTHORIZED.CODE,
                        statusCode: NOT_AUTHORIZED.CODE,
                        error: NOT_AUTHORIZED.MESSAGE
                    })
                }
                data = data?.data || data?.response || data;

                if (data?.myxalary?.employees) {
                    data = data.myxalary.employees.find((employee) => employee._id === employeeID);
                }
                if (!data) {
                    return res.status(NOT_AUTHORIZED.CODE).json({
                        code: NOT_AUTHORIZED.CODE,
                        statusCode: NOT_AUTHORIZED.CODE,
                        error: NOT_AUTHORIZED.MESSAGE
                    })
                }
                const isEmployee = !!employeeID || myxalaryEmployee;
                req.user = {
                    ...data,
                    userRole: data.userRole || 'employee',
                    userId: employeeID || data._id,
                    firstName: data.firstName,
                    lastName: data.lastName,
                    fullName: data.fullname || (`${data.firstName} ${data.lastName}`),
                    isAdmin: !isEmployee,
                    companyID: companyID || data.companyID._id || data.companyID,
                    fid: data.myx3ID,
                    email: data.employeeEmail || data.userEmail,
                    profileImgUrl: data.profileImgUrl || data.imageUrl,
                    permissions: data.permissions,
                    isEmployee,
                    isManager: data.employeeSubordinates?.length > 0,
                    subordinates: data.employeeSubordinates,
                    manager: data.employeeManager,
                    myxalaryEmployee,
                    isMobileClient: AUTH_URL === finratusAPI,
                    token
                }
                next()
            },
            isEmployee: async function (req, res, next) {
                if (!req.user.isEmployee) {
                    return res.status(FORBIDDEN.CODE).json({
                        code: FORBIDDEN.CODE,
                        statusCode: FORBIDDEN.CODE,
                        error: FORBIDDEN.MESSAGE
                    })
                }
                next()
            },
            isAdmin: async function (req, res, next) {
                if (!req.user.isAdmin) {
                    return res.status(FORBIDDEN.CODE).json({
                        code: FORBIDDEN.CODE,
                        statusCode: FORBIDDEN.CODE,
                        error: FORBIDDEN.MESSAGE
                    })
                }
                next()
            },
            isSupervisor: async function (req, res, next) {
                if (!req.user.subordinates?.length) {
                    return res.status(FORBIDDEN.CODE).json({
                        code: FORBIDDEN.CODE,
                        statusCode: FORBIDDEN.CODE,
                        error: FORBIDDEN.MESSAGE
                    })
                }
                next()
            },
            isMobileClient: async function (req, res, next) {
                if (!req.user.isMobileClient) {
                    return res.status(FORBIDDEN.CODE).json({
                        code: FORBIDDEN.CODE,
                        statusCode: FORBIDDEN.CODE,
                        error: FORBIDDEN.MESSAGE
                    })
                }
                next()
            },
            isSupervisorOrAdmin: async function (req, res, next) {
                const { isManager, isAdmin } = req.user;
                if (!(isManager || isAdmin)) {
                    return res.status(FORBIDDEN.CODE).json({
                        code: FORBIDDEN.CODE,
                        statusCode: FORBIDDEN.CODE,
                        error: FORBIDDEN.MESSAGE
                    })
                }
                next()
            },
        }
    }
}

export default Authentication_Authorization;