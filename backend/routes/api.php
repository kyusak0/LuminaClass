<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
// use App\Http\Controllers\TestController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\BookingController;
use App\Http\Controllers\ChatController;
use App\Http\Controllers\FileController;
use App\Http\Controllers\GroupController;
use App\Http\Controllers\LogController;
use App\Http\Controllers\TaskController;
use App\Http\Controllers\OrganizationController;


/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| Here is where you can register API routes for your application. These
| routes are loaded by the RouteServiceProvider and all of them will
| be assigned to the "api" middleware group. Make something great!
|
*/

// Route::middleware('auth:sanctum')->get('/user', function (Request $request) {
//     return $request->user();
// });
Route::middleware('api')->group(function () {
    // Публичные маршруты
    Route::post('/register', [UserController::class, 'createBooking']);
    Route::post('/login', [UserController::class, 'login']);
    
    // Защищенные маршруты
    Route::middleware('auth:sanctum')->group(function () {
        Route::post('/create-user', [UserController::class, 'createUser']);
        Route::get('/get-users', [UserController::class, 'users']);
        Route::post('/funcrole', [UserController::class, 'funcrole']);
        Route::post('/remove-student', [UserController::class, 'removeStudent']);
        Route::get('/get-user/{id}', [UserController::class, 'getUserInfo']);
        Route::post('/user/{id}/edit', [UserController::class, 'EditUserData']);
        Route::post('/user/{id}/set-avatar', [UserController::class, 'setAvatar']);

        Route::post('/create-organization', [OrganizationController::class, 'createOrg']);
        Route::get('/get-organizations', [OrganizationController::class, 'allOrganizations']);
        Route::post('/delete-organization/{id}', [OrganizationController::class, 'deleteOrganization']);
        Route::get('/get-organization-info/{id}', [OrganizationController::class, 'getOrganizationInfo']);

        Route::get('/get-bookings', [BookingController::class, 'getBookings']);
        Route::get('/get-booking/{id}', [BookingController::class, 'getBookingInfo']);
        Route::post('/bookings/{id}/edit', [BookingController::class, 'editBooking']);
        Route::post('/users/reset-password', [BookingController::class, 'resetPassword']);

        Route::post('/save-file', [FileController::class, 'saveFile']);
        Route::get('/get-files', [FileController::class, 'show']);
        Route::get('/get-file/{id}', [FileController::class, 'fileInfo']);
        Route::get('/files/download/{id}', [FileController::class, 'loadFile']);
        Route::post('/files/download/{id}', [FileController::class, 'loadFile']);
        Route::post('/files/delete/{id}', [FileController::class, 'deleteFile']);
        Route::get('/get-archive-contents/{id}', [FileController::class, 'getArchiveContents']);

        Route::post('/save-file-from-url', [FileController::class, 'saveFileFromUrl']);
        Route::get('/files/serve/{id}', [FileController::class, 'serveFile']);
        Route::post('/extract-file', [FileController::class, 'extractFile']);

        Route::get('/get-office-content/{id}', [FileController::class, 'getOfficeFileContent']);

        Route::get('/get-groups', [GroupController::class, 'allGroups']);
        Route::post('/create-group', [GroupController::class, 'createGroup']);
        Route::post('/delete-group/{id}', [GroupController::class, 'deleteGroup']);
        Route::get('/get-group-info/{id}', [GroupController::class, 'getGroupInfo']);
        Route::get('/get-user-groups/{id}', [GroupController::class, 'getUserGroups']);
        Route::get('/get-teacher-groups/{id}', [GroupController::class, 'getTeacherGroups']);
        Route::post('/group/{id}/change-teacher', [GroupController::class, 'changeTeacherGroups']);

        Route::post('/create-task', [TaskController::class, 'createTask']);
        Route::get('/get-tasks', [TaskController::class, 'allTasks']);
        Route::get('/get-task/{id}', [TaskController::class, 'getTask']);
        Route::post('/create-answer', [TaskController::class, 'setAnswer']);
        Route::post('/grade-task', [TaskController::class, 'gradeTask']);
        Route::get('/get-answers', [TaskController::class, 'allAnswers']);
        Route::get('/get-answers/{id}', [TaskController::class, 'getAns']);
        Route::get('/get-performance', [TaskController::class, 'getPerformance']);
        Route::get('/get-performance-student/{id}', [TaskController::class, 'getPerformanceStudent']);

        Route::get('/get-logs', [LogController::class, 'getLogs']);

        Route::post('/users/{id}/block', [UserController::class, 'blockUser']);
        Route::post('/users/{id}/unblock', [UserController::class, 'unblockUser']);
        Route::get('/users/blocked', [UserController::class, 'getBlockedUsers']);
        Route::get('/users/active', [UserController::class, 'getActiveUsers']);
        Route::get('/get-users', [UserController::class, 'getUsers']);

        Route::post('/chat/send', [ChatController::class,'send']);
        Route::get('/chat/history/{channel}', [ChatController::class, 'historyChat']);
        Route::post('/groups/{groupId}/chat/send', [ChatController::class,'groupChatSend']);

        Route::get('/groups/{groupId}/chat/history', [ChatController::class,'showHistoryGroup']);


        Route::get('/user', [UserController::class, 'user']);
        Route::post('/logout', [UserController::class, 'logout']);
    });
    
    Route::middleware(['auth:sanctum', 'check.blocked'])->group(function () {
        Route::get('/user', [UserController::class, 'user']);
        Route::post('/logout', [UserController::class, 'logout']);
    });
});