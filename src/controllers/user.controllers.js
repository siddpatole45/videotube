import {asyncHandler} from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js";
import { User } from "../models/User.models.js";
import { uploadOnCloudinary } from "../models/Cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";


const registerUser= asyncHandler( async(req,res)=>{

    //steps or algorithm
    //1.get user details from frontend
    //2.validation -check not empty
    //3.check if the user already exists
    //4.check for the images and avatars
    //5.upload them to coludinary
    //6.create user object -create entry in database
    //7.remove password and refresh token field from response
    //8.check for user creation
    //9.return response
    
    //step1:
   const {email,fullname,username,password}=req.body;
    //step2:
    /*beginers 
    if(fullname===""){
        throw new ApiError(400,"fullname required")
    }*/
    //professionals:
    // console.log("username:",username)
    if(
        [fullname,email,username,password].some((field)=>
        field?.trim()===""
        )
    ){
        throw new ApiError(400,"every field is required")
    }
    //step 3.

    const existedUser=await User.findOne(
        { $or : [{username},{email}]}
    )
    if(existedUser){
        throw new ApiError(400,"User already exists")
    }
    //step4.

    const avatarLocalPath=req.files.avatar[0]?.path;
    const coverimageLocalPath=req.files.coverimage[0].path;

    if(!avatarLocalPath){
        throw new ApiError(400,"Avatar file is must")
    }
    //step5.

    const avatar=await uploadOnCloudinary(avatarLocalPath)
    const coverimage=await uploadOnCloudinary(coverimageLocalPath)
    //console.log(avatar);

    if(!avatar){
        throw new ApiError(400,"Avatar file REQUIRED")
    }

    // step6.
    const user=await User.create({
        fullname,
        avatar:avatar.url,
        email,
        username:username.toLowerCase(),
        coverimage:coverimage?.url ||" ",
        password
    })
    //step 7 and 8
    const createdUser= await User.findById(user._id).select(
        "-password -refreshtoken" //no commas just space
    )
    if(!createdUser){
        throw new ApiError(500,"something went wrong while registering!")
    }
    //step9.

    res.status(202).json(
        new ApiResponse(200 ,createdUser,"User registered Sucessfully!")
    )





   
   
})



//creating a method for generating Access and Refresh Tokens
const generateAccessAndRefreshToken= async(userId)=>{
    try {
        const user=await User.findById(userId);
        const accesstoken=user.generateAccessToken();
        const refreshtoken=user.generateRefreshToken();

        //saving refresh token in db
        user.refreshtoken=refreshtoken;
        //console.log(refreshtoken)
        return {accesstoken,refreshtoken};

    } catch (error) {
        throw new ApiError(500,"something wents wrong while generating Access and Refresh token")
    }
}


const loginUser = asyncHandler( async (req,res)=>{
    //console.log('Request body:', req.body);
    //steps or algorithm for login 
    //1fetch data from request body
    //2check username or email
    //3find user
    //4check password
    //5generate access and refresh tokens 
    //6send cookies
    //7response of successfull login

    //step1.
    const {email,username,password}=req.body;

    //step2.
    // console.log("email:",email)
    if(!username && !email) {
        
        throw new ApiError(400,"username or email required !")
    }
    // if(!email){
    //     throw new ApiError(400,"username or email required !")
    // }
    //step3.
    const user=await User.findOne({
        $or:[{username},{email}]
    })
    if(!user){
        throw new ApiError(400,"User doesnt exists")
    }
    //step4.
    const isPasswordValid=await user.isPasswordCorrect(password);
    if(!isPasswordValid){
        throw new ApiError(400,"Invalid User Credentials")
    }
    //step5.
    const {accesstoken,refreshtoken}=await generateAccessAndRefreshToken(user._id)

    //step6. sending cookies

    const loggedInUser= await User.findById(user._id).select("-password -refreshtoken")//removing password and refreshtoken from cookie

    const options={
        httpOnly:true,
        secure:true
    }
    return res.status(200)
    .cookie("accesstoken",accesstoken,options)
    .cookie("refreshtoken",refreshtoken,options)
    .json(
        new ApiResponse(
            200,
            {
                user:loggedInUser,accesstoken,refreshtoken
            },
            "User logged In Successfully"
        )
    )


})

const logoutUser=asyncHandler(async(req,res)=>{
    User.findByIdAndUpdate(
        req.user._id,
        {
            $set:{
                refreshtoken:undefined
            }
        },
        {
            new:true
        }
    )
    const options={
        httpOnly:true,
        secure:true
    }
    return res
    .status(200)
    .clearCookie("accesstoken",options)
    .clearCookie("refreshtoken",options)
    .json(new ApiResponse(200,{},"User Logged out"))
}) 
export {
    registerUser,loginUser,logoutUser
};