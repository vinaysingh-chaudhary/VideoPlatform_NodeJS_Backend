import  { Schema, model } from "mongoose";
import bcrypt from 'bcrypt'; 
import jwt from "jsonwebtoken";

const userSchema = new Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      tolowercase: true,
      trim: true,
      index: true
    },
    email: {
      type: String,
      required: true,
      unique: true,
      tolowercase: true,
      trim: true,
    },
    fullName: {
      type: String,
      required: true,
      trim: true,
      index: true
    },
    avatar: {
      type: String,
      required:true
    },
    coverImage: {
      type: String,
    },
    watchHistory: [
        {
            type: Schema.Types.ObjectId,
            ref: "Video" 
        }
    ],
    password: {
      type: String,
      required: [true, "password should be at least of 10 characters"],
      trim: true,
    },
    refreshToken: {
      type: String,
    },
  },
  { timestamps: true }
);


userSchema.pre("save", async function(next){
    if(this.isModified("password")) return next(); 

    this.password = await bcrypt.hash( this.password, 10); 
    next(); 
})


userSchema.method.isPasswordCorrect = async function(password){
    return await bcrypt.compare(password, this.password); 
}


userSchema.method.generateAccessToken = function(){
  return  jwt.sign({
         _id: this._id,
         email: this.email,
         username: this.username
        },
        process.env.ACCESS_TOKEN_SECRET,
        {
            expiresIn: process.env.ACCESS_TOKEN_EXPIRY
        }
    )
}


userSchema.method.generateRefreshToken = function(){
    return  jwt.sign({
        _id: this._id,
        email: this.email,
        username: this.username
       },
       process.env.REFRESH_TOKEN_SECRET,
       {
           expiresIn: process.env.REFRESH_TOKEN_EXPIRY
       }
   )
}


export default User = model("User", userSchema);