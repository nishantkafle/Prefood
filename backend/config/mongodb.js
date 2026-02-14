import mongoose from "mongoose";

const connectDB = async () => {
  try {
    mongoose.connection.on("connected", () =>
      console.log("MongoDB Connected")
    );
    mongoose.connection.on("error", (err) =>
      console.error("MongoDB Connection Error:", err)
    );
    mongoose.connection.on("disconnected", () =>
      console.log("MongoDB Disconnected")
    );

    const mongoURI = process.env.MONGODB_URI || process.env.MONGODB_URL || 'mongodb://localhost:27017/prefood';
    await mongoose.connect(mongoURI);
    console.log("MongoDB connection established");
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
    // Don't exit - let the app continue but log the error
    // process.exit(1);
  }
};

export default connectDB;