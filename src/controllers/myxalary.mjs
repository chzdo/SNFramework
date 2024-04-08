import { Types } from "mongoose"
import db from "../utils/db.mjs"
const myxalaryController = {

    getMyxalaryUsers: async (companyID) => {
        const users = await db.Users.aggregate([
            {
                $match:
                /**
                 * query: The query in MQL.
                 */
                {
                    companies: {
                        $elemMatch: {
                            companyID: new Types.ObjectId(
                                companyID
                            ),
                            isActive: true,
                        },
                    },
                },
            },
            {
                $unwind:
                {
                    path: "$companies",
                },
            },
            {
                $match:

                {
                    "companies.companyID": new Types.ObjectId(
                        companyID
                    )
                },
            },
            {
                $lookup:
                {
                    from: "roles",
                    let: {
                        userRole: "$userRole",
                    },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        {
                                            $eq: [
                                                "$roleName",
                                                "$$userRole",
                                            ],
                                        },
                                        {
                                            $eq: [
                                                "$companyID",
                                                new Types.ObjectId(
                                                    companyID
                                                ),
                                            ],
                                        },
                                    ],
                                },
                            },
                        },
                        {
                            $project: {
                                roleName: 1,
                                permissions: 1,
                            },
                        },
                    ],
                    as: "role",
                },
            },
            {
                $unwind:
                {
                    path: "$role",
                },
            },
            {
                $project:
                {
                    fullName: {
                        $concat: [
                            "$firstName",
                            " ",
                            "$lastName",
                        ],
                    },
                    firstName: 1,
                    lastName: 1,
                    userEmail: 1,
                    profileImgUrl: 1,
                    isAdmin: true,
                    role: 1,
                    phone: 1,
                },
            },
        ]).toArray()
        return users
    }
}

export default myxalaryController