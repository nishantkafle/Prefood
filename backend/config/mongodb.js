import mongoose from "mongoose";

const connectDB = async () => {
  mongoose.connection.on("connected", () =>
    console.log("MongoDB Connected")
  );
  mongoose.connection.on("error", (err) =>
    console.error("MongoDB Connection Error:", err)
  );
  mongoose.connection.on("disconnected", () =>
    console.log("MongoDB Disconnected")
  );

  const mongoURI = process.env.MONGODB_URI || process.env.MONGODB_URL || '';
  const allowInMemory = String(process.env.ALLOW_INMEMORY_DB || '').toLowerCase() === 'true';

  // Try Atlas/remote connection first
  if (mongoURI) {
    try {
      console.log("Connecting to MongoDB Atlas...");
      await mongoose.connect(mongoURI, {
        serverSelectionTimeoutMS: 15000,
        socketTimeoutMS: 30000,
      });
      console.log("MongoDB Atlas connection established");
      return;
    } catch (error) {
      console.error("Atlas connection failed:", error.message);
      if (!allowInMemory) {
        console.error("MongoDB Atlas connection is required. Set ALLOW_INMEMORY_DB=true only if you want a temporary in-memory DB.");
        process.exit(1);
      }
      console.log("Falling back to in-memory MongoDB (ALLOW_INMEMORY_DB=true)...");
    }
  }

  // Fallback: in-memory MongoDB
  try {
    const { MongoMemoryServer } = await import('mongodb-memory-server');
    const mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();
    await mongoose.connect(uri);
    console.log("In-memory MongoDB connection established (data will not persist)");
  } catch (error) {
    console.error("All MongoDB connections failed:", error.message);
    process.exit(1);
  }
};

export default connectDB;