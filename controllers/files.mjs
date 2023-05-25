import express from "express";
import fileUpload from "express-fileupload"
import cloudinary from "cloudinary"
import streamifier from "streamifier"
import utils from "../utils/index.mjs";
const Router = express.Router();




const cloudUpload = function (file) {
    try {
        let resource_type = 'raw'
        if (file.mimetype.includes("image") || file.mimetype.includes("video")) {
            resource_type = 'auto';
        }
        return new Promise((resolve, reject) => {
            const stream = cloudinary.v2.uploader.upload_stream({ folder: "learning", resource_type },
                function (error, result) {
                    if (error) {
                        reject(error);
                        return;
                    }
                    resolve({ ...result })
                })
            streamifier.createReadStream(file.data).pipe(stream);
        })
    } catch (error) {
        console.log(error)
    }
}

const uploadWithCloudinary = utils.wrapper(async (req, res) => {
    try {
        const files = req.files;
        if (!files) {
            return {
                code: 400,
                data: {
                    error: `Please attach a file`
                }
            }
        }
        let uploaded = {};
        for (let file in files) {
            let fileObj = files[file];
            if (Array.isArray(fileObj)) {
                fileObj = fileObj.map(async (file) => {
                    return await cloudUpload(file)
                })

            } else {
                fileObj = cloudUpload(fileObj);
            }
            console.log({ fileObj })
            uploaded[file] = await (Array.isArray(fileObj) ? Promise.all(fileObj) : fileObj)
        }
        return {
            code: 201,
            data: {
                ...uploaded
            }
        }
    } catch (error) {
        console.log(error);
        return {
            code: 500,
            data: {
                error: "server error"
            }
        }
    }
})
const UploadFile = {
    selectedService: null,
    setup: function ({ type = utils.FILE_TYPES.AZURE, options }) {
        if (type === utils.FILE_TYPES.CLOUDINARY) {
            cloudinary.config(options);
            this.selectedService = uploadWithCloudinary
        } else {

        }

        return this;
    },
    addUploadFileRoute() {
        Router.post("/files", [fileUpload({
        })], this.selectedService)
        return Router;
    }
}


export default UploadFile