import mongoose from "mongoose";

const connectDb = (url) => {
    mongoose.connect(url)
        .then(() => {
            console.log("Connected to MongoDB");
        })
        .catch((err) => {
            console.log(err);
        });
}

export default connectDb