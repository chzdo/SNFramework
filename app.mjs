import mongoose, { Mongoose, Schema } from "mongoose";
import SNFramework from "./src/index.mjs"
import express from "express";
import cors from "cors";
import Joi from "joi";
import config from "dotenv";
config.config()
console.log(`here`)
import db from "./src/utils/db.mjs";
import { Axios } from "axios";
const app = express();




const framework = new SNFramework();

const models = [
    {
        name: "user",
        schema: new Schema({
            name: {
                type: String,
                unique: true
            },
            age: {
                type: Number,
                default: 0
            },
            company: {
                type: mongoose.Types.ObjectId,
                ref: "company",

            }
        })
    },
    {
        name: "company",
        schema: new Schema({
            name: {
                type: String,
            }
        })
    },
    {
        name: "tp",
        schema: new Schema({
            name: {
                type: String,
            }
        })
    }
]

app.use(cors({}));
app.use(express.json({}));
app.use(express.urlencoded({}));
app.use(framework.utils.responseTransformer);
app.set("trust proxy", true)

framework.setMG({
    url: "mongodb://127.0.0.1:27017/test",
    models
})

const auth = framework.appAuth.setup({
    finratusAPI: process.env.FINRATUS_API
})

app.use(auth.setLicense("Payroll"));

app.get("/test", [
    auth.rate({
        max: 5, time: 1 * 60 * 1000, handler: (req) => {
            console.log(req.ip)
        }
    }), auth.allowIPAddress({ whitelist: ["192.0.0.1"] })], async (req, res) => {

    })


app.all("/", [auth.auth, auth.hasLicense], async (req, res) => {

    const result = await framework.myxalary.filterLicenses(req.user.companyID, [
        {
            id: "662554b73799cfbd24684917",
            name: "test"
        },
        {
            id: "6565eaf886b8704d104e313c",
            name: "test 2"
        }
    ], req.license)

    if (result) {
        //This means there was an Error with atleast one Employee
        console.log(result)
    }

    //No Error All Employees Have License
    res.send(result)
})

const router = express.Router();

router.post("/", (req, res) => {

})

app.get("/query-test", (req, res) => {
    const buildQuery = framework.utils.buildQuery(req.query);
    console.log(JSON.stringify(buildQuery))
})
// app.use("/test", router)

const testValidation = Joi.object({
    name: Joi.string().required(),
    company: Joi.string()
})

const callback = {
    insert: framework.utils.wrapper((req, res) => {
        return {
            code: 200,
            data: {
                message: `from callback`,
                data: req.data
            }
        }
    })
}
const user = framework.mg.getModel("user");
const userController = framework.createController({ name: "test", model: user, callback, populateOptions: ["company"], flat: { company: { name: "CompanyName" } } });
userController.registerValidation({ create: testValidation, unique: "name" });
app.use("/", userController.registerRoutes({}));

const company = framework.mg.getModel("tp");
const companyController = framework.createController({ name: "tp", model: company });
//comController.registerValidation({ create: testValidation, unique: "name" });
app.use("/", companyController.registerRoutes({}));

// console.log(await user.create({ name: "stanley" }))

// console.log(await user.findAll({ query: {}, page: 3, limit: 70 }))




app.all("/excel", [framework.appAuth.setup({
}).auth,], (req, res) => {
    const excelSheets = [
        {
            title: 'Overview',
            columns: {
                "name": { title: "Full Name", width: 20 },
                "age": { title: "Age", width: 20 },
                "dob": { hidden: true }
            },
            rows: [{
                name: "Stanley Nduaguibe",
                age: 1000,
                dob: "2023-03-03"
            }]
        }
    ]
    framework.export({ sheets: excelSheets, fileName: "test", stream: res, reportType: framework.utils.types.EXCEL })

})


app.all("/txt", (req, res) => {
    const settings = {
        rows: [
            {
                name: "Stanley",
                age: 10
            }],
        useHeader: true,
        delimiter: ",",
        columns: {
            name: {},
            age: {}
        }
    }
    framework.export({ settings, fileName: "test", stream: res, reportType: req.query.type })
})

app.all("/pdf", (req, res) => {
    const settings = {
        data: [
            {
                name: "Stanley",
                age: 10
            }],
    }
    framework.export({ settings, fileName: "test", stream: res, reportType: framework.utils.types.PDF })
})

app.listen(3300, () => {
    console.log(`db running`, 'http://localhost:3300')
});

//get routes for models


// const axios = new Axios();
// axios.get("http://localhost:3300",{

// })