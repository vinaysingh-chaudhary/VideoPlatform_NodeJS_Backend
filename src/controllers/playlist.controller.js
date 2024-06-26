import mongoose from "mongoose";
import { Playlist } from "../models/playlist.model.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import asyncHandler from "../utils/asyncHandler.js";
import Video from '../models/video.model.js'


export const createPlaylist = asyncHandler(async(req, res) => {
    const { name, description } = req.body; 
    const userId = req?.user._id;  

    if(!name)
    throw new ApiError(400, "Provide playlist name");  

    if(!userId)
    throw new ApiError(401, "Unauthorised User"); 

    const playlist = await Playlist.create({
        name,  
        description : description || "a playlsit", 
        owner: userId
    }); 

    if(!playlist)
    throw new ApiError(500, "Failed to create playlist"); 

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            playlist, 
            "Playlist created successfully"
        )
    )

})


//endpoints which need playlistId
export const getPlaylistById = asyncHandler(async(req, res) => {
    const { playlistId } = req.params
     
    if(!playlistId)
    throw new ApiError(404, "Playlist id isn't available"); 

    const playlist = await Playlist.aggregate([
        {
            $match:{
                _id: new mongoose.Types.ObjectId(playlistId)
            }
        }, 
        {
            $lookup:{
                from : "users", 
                localField: "owner",
                foreignField: "_id",
                as: "owner",
                pipeline:[
                    {
                        $project:{
                            username: 1,
                            fullName:1,
                        }
                    }
                ]
            }
        },
        {
            $lookup:{
                from: "videos",
                localField: "videos",
                foreignField: "_id",
                as: "videos",
                pipeline:[
                    {
                        $project:{
                            title:1,
                            thumbnail:1,
                            description:1
                        }
                    }
                ]
            }
        },
        {
            $addFields:{
                owner:{
                    $arrayElemAt:  ["$owner", 0] 
                },
            }
        }
    ]); 

    if(!playlist)
        throw new ApiError(404, "No playlist found"); 

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            playlist,
            "Playlist fetched successfully"
        )
    ); 
})

export const updatePlaylist = asyncHandler(async(req, res) => {
    const { playlistId } = req.params; 
    const { name, description } = req.body; 
    const userId = req?.user._id; 
    
    if(!playlistId)
    throw new ApiError(404, "Playlist id not found"); 

    const playlist = await Playlist.findById(playlistId); 
    if(!playlist)
    throw new ApiError(500, "No playlist found"); 

    if(playlist.owner.toString() !== userId.toString())
        throw new ApiError(500, "Unauthorised user to update playlist"); 

    if(name) playlist.name = name; 
    if(description) playlist.description = description; 

    const updatedPlaylistRefrence = await playlist.save({validateBeforeSave: false}); 
    if(!updatedPlaylistRefrence)
        throw new ApiError(500, "Failed to update playlist"); 

    return res
    .status(200)
    .json(
        new ApiResponse(
            200, 
            updatedPlaylistRefrence,
            "Playlist updated Successfully"
        )
    );
})

export const deletePlaylist = asyncHandler(async(req, res) => {
    const { playlistId } = req.params; 
    const userId = req?.user._id; 
        
    if(!playlistId)
       throw new ApiError(404, "Playlist id not found"); 

    const playlist = await Playlist.findById(playlistId); 
    if(!playlist)
        throw new ApiError(404, "No playlist found"); 

    if(playlist.owner.toString() !== userId.toString())
       throw new ApiError(500, "Unauthorised user to delete playlist");

    const deletedPlaylistRefrence = await Playlist.findByIdAndDelete(playlistId); 
    if(!deletedPlaylistRefrence)
        throw new ApiError(500, "Failed to delete playlist, try again"); 

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            deletedPlaylistRefrence,
            "Playlist deleted successfully"
        )
    );
})


export const addVideoToPlaylist = asyncHandler(async(req, res) => {
    const { videoId, playlistId } = req.params;
    const userId = req?.user._id;  

    if(!videoId)
        throw new ApiError(401, "videoId is missing"); 
    
    if(!playlistId)
        throw new ApiError(401, "playlistID is missing"); 

    const video = await Video.findById(videoId); 
    if(!video)
        throw new ApiError(404, "Video not found"); 

    const playlist = await Playlist.findById(playlistId); 
    if(!playlist)
        throw new ApiError(404, "No playlist found"); 

    if(playlist.owner.toString() !== userId.toString())
        throw new ApiError(500, "Unauthorised user to update playlist"); 

    playlist.videos.push(new mongoose.Types.ObjectId(videoId));

    const updatedPlaylistRefrence = await playlist.save({validateBeforeSave: false}); 
    if(!updatedPlaylistRefrence)
        throw new ApiError(500, "Failed to update playlist"); 

    return res
    .status(200)
    .json( 
        new ApiResponse(
            200, 
            updatedPlaylistRefrence, 
            "Video added to playlist successfully"
        )
    )
}); 


export const deleteFromPlaylist = asyncHandler(async(req, res) =>{
    const {videoId, playlistId} = req.params; 
    const userId = req?.user._id; 

    if(!videoId)
      throw new ApiError(404, "videoId is missing"); 

   if(!playlistId)
      throw new ApiError(404, "playlistId is missing"); 

    const playlist = await Playlist.findById(playlistId);
    if(!playlist)
       throw new ApiError(404, "No playlist found"); 

    if(playlist.owner.toString() !== userId.toString())
        throw new ApiError(500, "Unauthorised user to remove the video"); 

    const isVideoAvailable = await Playlist.find({
            videos: {
                $in: [ new mongoose.Types.ObjectId(videoId)]
            }
    }); 

    if(!isVideoAvailable)
        throw new ApiError(500, "This video doesn't exists in playlist"); 
    
    const updatedPlaylistRefrence = await Playlist.findByIdAndUpdate(
        playlistId,
        {
            $pull: {
                videos: new mongoose.Types.ObjectId(videoId)
            }
        },
        {
            new: true
        }
    ); 

    if(!updatedPlaylistRefrence)
        throw new ApiError(500, "Failed to remove the video from playlist"); 

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            updatedPlaylistRefrence,
            "Video removed from playlist successfully"
        )
    )
}); 


export const getUsersPlaylists = asyncHandler(async(req, res) => {
    const {userId} = req.params;

    if(!userId)
        throw new ApiError(401, "userId is missing"); 
    
    const playlists = await Playlist.find({owner: userId}); 
    if(!playlists)
    throw new ApiError(404, "No playlist found"); 

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            playlists,
            "All Playlists fetched"
        )
    )
}); 






