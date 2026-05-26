<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

use App\Models\File;

class TestController extends Controller
{
    public function index(){

        $name = 'Diana';

        return response()->json([
            'message' => 'hello from '.$name,
        ]);
    }

    public function testFile(Request $request)
    {
        $request->validate([
            'file' => 'required|file|max:10240',
            'author_id' => 'required|exists:users,id',
        ]);
        
        $uploadedFile = $request->file('file');

        $existingFile = File::where('original_name', $uploadedFile->getClientOriginalName())
                        ->where('size', $uploadedFile->getSize())
                        ->where('author_id', $request->author_id)
                        ->first();

        if ($existingFile) {
            return response()->json([
                'message' => 'Файл уже существует',
            ]);
        }else {
            $path = $uploadedFile->store('uploads', 'public');

        $file = new File();
        $file->original_name = $uploadedFile->getClientOriginalName();
        $file->path = $path;
        $file->mime_type = $uploadedFile->getMimeType();
        $file->size = $uploadedFile->getSize();
        $file->author_id = $request->author_id;
        $file->save();
        
        return response()->json([
            'message' => 'Файл успешно загружен',
            'file_id' => $file->id,
            'url' => Storage::url($path)
        ]);
        }
        
        
    }
}
