import mongoose from "mongoose";

let isConnected = false; // Variable to track the connection status

export const connectToDB = async () => {
  mongoose.set("strictQuery", true);

  if (!process.env.MONGODB_URI) return console.log("MONGODB IS NOT DEFINED");

  if (isConnected) return console.log("USING EXISTING DATABASE CONNECTION");

  try {
    await mongoose.connect(process.env.MONGODB_URI);
    isConnected = true;

    console.log("MongoDB Connected");
  } catch (error) {
    console.log(error);
  }
};
