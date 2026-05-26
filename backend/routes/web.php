<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
});

Route::get('/sanctum/csrf-cookie', function() {
    return response()->json(['csrf_token' => csrf_token()]);
});

Route::post('/create-user', [App\Http\Controllers\UserController::class, 'createUser'])->name('user.create');
