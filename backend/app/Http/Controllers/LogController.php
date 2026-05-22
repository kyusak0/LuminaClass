<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

use App\Models\Log;

class LogController extends Controller
{
    public function getLogs(){
       $logs = Log::with(['user'])->get();

        return response()->json([
            'data' => $logs,
        ],200,[], JSON_UNESCAPED_UNICODE);
    }
}
