<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Log;
use PhpOffice\PhpPresentation\IOFactory as PresentationIOFactory;
use PhpOffice\PhpPresentation\Shape\RichText;
use PhpOffice\PhpWord\IOFactory as WordIOFactory;
use PhpOffice\PhpWord\Element\TextRun;

use App\Models\File;
use App\Models\Log as ActionLog; // Добавляем модель для логирования действий

class FileController extends Controller
{
    private function logAction($action, $method, $userId, $ip, $details = null)
    {
        if (!$userId) {
            $userId = auth()->id();
        }
        
        return ActionLog::create([
            'action' => $action,
            'method' => $method,
            'user_id' => $userId,
            'ip' => $ip,
            'details' => $details ? json_encode($details, JSON_UNESCAPED_UNICODE) : null,
            'created_at' => now()
        ]);
    }

    public function saveFile(Request $request)
    {
        $request->validate([
            'file' => 'required|file|max:2000000|mimes:jpg,jpeg,png,gif,pdf,mp4,doc,docx,ppt,pptx,xls,xlsx,txt,zip',
            'author_id' => 'required|exists:users,id',
        ]);
        
        $uploadedFile = $request->file('file');

        $existingFile = File::where('original_name', $uploadedFile->getClientOriginalName())
                        ->where('size', $uploadedFile->getSize())
                        ->where('author_id', $request->author_id)
                        ->first();

        $path = $uploadedFile->store('uploads', 'public');

        $file = new File();
        $file->original_name = $uploadedFile->getClientOriginalName();
        $file->path = $path;
        $file->mime_type = $uploadedFile->getMimeType();
        $file->size = $uploadedFile->getSize();
        $file->author_id = $request->author_id;
        $file->save();
        
        // Логируем загрузку файла
        $this->logAction(
            'Загрузка файла',
            'POST',
            $request->author_id,
            $request->ip(),
            [
                'file_id' => $file->id,
                'file_name' => $file->original_name,
                'file_size' => $file->size,
                'mime_type' => $file->mime_type
            ]
        );
        
        return response()->json([
            'message' => 'Файл успешно загружен',
            'file_id' => $file->id,
            'url' => Storage::url($path)
        ], 200, [], JSON_UNESCAPED_UNICODE);
        
    }

    public function show() {
        $files = File::all();
        return response()->json([
            'data' => $files,
        ]);
    }

    public function fileInfo($id){
        $file = File::with(['user'])->findOrFail($id);
        return response()->json([
            'data' => $file,
        ]);
    }

    public function loadFile($id, Request $request){
        $file = File::findOrFail($id);
        
        $filePath = 'public/' . $file->path;
        
        if (!Storage::exists($filePath)) {
            Log::warning('File not found in storage', [
                'file_id' => $file->id,
                'path' => $file->path,
                'user_id' => auth()->id() ?? null,
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Файл не найден в хранилище',
            ], 404);
        }

        // Логируем скачивание файла
        $this->logAction(
            'Скачивание файла',
            'GET',
            auth()->id(),
            $request->ip(),
            [
                'file_id' => $file->id,
                'file_name' => $file->original_name
            ]
        );

        // Скачиваем файл
        return Storage::download($filePath, $file->original_name, [
            'Content-Type' => $file->mime_type,
            'Content-Length' => $file->size,
        ]);
    }

    public function deleteFile($id, Request $request) {
        $file = File::findOrFail($id);
        
        // Сохраняем данные файла для лога
        $fileData = [
            'file_id' => $file->id,
            'original_name' => $file->original_name,
            'size' => $file->size,
            'mime_type' => $file->mime_type,
            'author_id' => $file->author_id
        ];
        
        $filePath = 'public/' . $file->path;
        if (Storage::exists($filePath)) {
            Storage::delete($filePath);
        }
        $file->delete();
        
        // Логируем удаление файла
        $this->logAction(
            'Удаление файла',
            'DELETE',
            auth()->id(),
            $request->ip(),
            $fileData
        );

        return response()->json([
            'message' => 'успешно удалено'
        ]);
    }

    public function getArchiveContents($id, Request $request)
    {
        $file = File::findOrFail($id);
        
        // Проверка, что файл - архив
        if (!in_array($file->mime_type, ['application/zip', 'application/x-rar-compressed'])) {
            return response()->json([
                'success' => false,
                'message' => 'File is not an archive'
            ], 400);
        }
        
        // Логируем просмотр архива
        $this->logAction(
            'Просмотр содержимого архива',
            'GET',
            auth()->id(),
            $request->ip(),
            [
                'file_id' => $file->id,
                'file_name' => $file->original_name
            ]
        );
        
        // Здесь нужно реализовать чтение архива
        return response()->json([
            'success' => true,
            'files' => [
                ['id' => 1, 'name' => 'example.txt', 'type' => 'text']
            ]
        ]);
    }

    public function extractFile(Request $request)
    {
        $request->validate([
            'archive_id' => 'required|exists:files,id',
            'file_id' => 'required'
        ]);
        
        $archive = File::findOrFail($request->archive_id);
        
        // Логируем извлечение файла из архива
        $this->logAction(
            'Извлечение файла из архива',
            'POST',
            auth()->id(),
            $request->ip(),
            [
                'archive_id' => $request->archive_id,
                'archive_name' => $archive->original_name,
                'extracted_file_id' => $request->file_id
            ]
        );
    
        return response()->json([
            'success' => true,
            'file' => [
                'id' => uniqid(),
                'original_name' => 'extracted_file.txt',
                'file_type' => 'text',
                'content' => 'Extracted content'
            ]
        ]);
    }

    public function getFileContent($id, Request $request)
    {
        $file = File::findOrFail($id);
        $extension = strtolower(pathinfo($file->original_name, PATHINFO_EXTENSION));
        
        // Определяем тип файла
        $fileType = $this->getFileType($extension);
        
        // Проверяем есть ли сохраненный JSON контент
        $jsonDir = storage_path('app/json');
        $jsonPath = null;
        
        if ($fileType === 'powerpoint') {
            $jsonPath = $jsonDir . '/presentation_' . $file->id . '.json';
        } elseif ($fileType === 'excel') {
            $jsonPath = $jsonDir . '/excel_' . $file->id . '.json';
        } elseif (in_array($fileType, ['word', 'text'])) {
            $jsonPath = $jsonDir . '/document_' . $file->id . '.json';
        }
        
        // Если есть сохраненный JSON, возвращаем его
        if ($jsonPath && file_exists($jsonPath)) {
            $content = file_get_contents($jsonPath);
            
            // Для PowerPoint и Excel парсим JSON
            if ($fileType === 'powerpoint' || $fileType === 'excel') {
                $content = json_decode($content, true);
            }
            
            return response()->json([
                'success' => true,
                'content' => $content,
                'type' => $fileType
            ]);
        }
        
        // Если нет JSON, возвращаем пустой контент
        $emptyContent = $this->getEmptyContent($extension, $file->original_name);
        
        return response()->json([
            'success' => true,
            'content' => $emptyContent,
            'type' => $fileType
        ]);
    }

    public function saveFileContent(Request $request)
    {
        Log::info('Saving file content', [
            'file_id' => $request->file_id,
            'has_content' => !empty($request->content)
        ]);
        
        $request->validate([
            'file_id' => 'required|exists:files,id',
            'content' => 'required'
        ]);
        
        $file = File::findOrFail($request->file_id);
        $extension = strtolower(pathinfo($file->original_name, PATHINFO_EXTENSION));
        
        // Сохраняем старую версию контента для лога (если существует)
        $saveDir = storage_path('app/json');
        $oldContent = null;
        $oldFilePath = null;
        
        if (in_array($extension, ['ppt', 'pptx'])) {
            $oldFilePath = $saveDir . '/presentation_' . $file->id . '.json';
        } elseif (in_array($extension, ['xls', 'xlsx'])) {
            $oldFilePath = $saveDir . '/excel_' . $file->id . '.json';
        } else {
            $oldFilePath = $saveDir . '/document_' . $file->id . '.json';
        }
        
        if ($oldFilePath && file_exists($oldFilePath)) {
            $oldContent = file_get_contents($oldFilePath);
        }
        
        // Создаем директорию для сохранения
        if (!file_exists($saveDir)) {
            mkdir($saveDir, 0777, true);
        }
        
        // Очищаем старые JSON файлы для этого файла
        $oldFiles = glob($saveDir . "/*_{$file->id}.json");
        foreach ($oldFiles as $oldFile) {
            if (is_file($oldFile)) {
                unlink($oldFile);
            }
        }
        
        $content = $request->content;
        $savedFile = null;
        
        // Для PowerPoint
        if (in_array($extension, ['ppt', 'pptx']) || $file->file_type === 'powerpoint') {
            $savedFile = $saveDir . '/presentation_' . $file->id . '.json';
            file_put_contents($savedFile, json_encode($content, JSON_UNESCAPED_UNICODE));
        }
        // Для Excel
        elseif (in_array($extension, ['xls', 'xlsx']) || $file->file_type === 'excel') {
            $savedFile = $saveDir . '/excel_' . $file->id . '.json';
            file_put_contents($savedFile, json_encode($content, JSON_UNESCAPED_UNICODE));
        }
        // Для Word и текстовых файлов
        else {
            $savedFile = $saveDir . '/document_' . $file->id . '.json';
            $saveData = is_string($content) ? $content : json_encode($content);
            file_put_contents($savedFile, $saveData);
        }
        
        // Логируем сохранение контента
        $this->logAction(
            'Сохранение содержимого файла',
            'POST',
            auth()->id(),
            $request->ip(),
            [
                'file_id' => $file->id,
                'file_name' => $file->original_name,
                'file_type' => $this->getFileType($extension),
                'had_previous_content' => !is_null($oldContent),
                'content_size' => strlen(is_string($content) ? $content : json_encode($content))
            ]
        );
        
        Log::info('File saved', ['path' => $savedFile]);
        
        return response()->json([
            'success' => true,
            'message' => 'Content saved successfully',
            'path' => $savedFile
        ]);
    }
    
    private function getFileType($extension)
    {
        $types = [
            'txt' => 'text',
            'doc' => 'word',
            'docx' => 'word',
            'xls' => 'excel',
            'xlsx' => 'excel',
            'ppt' => 'powerpoint',
            'pptx' => 'powerpoint'
        ];
        
        return $types[$extension] ?? 'unknown';
    }

    private function parseFileContent($filePath, $extension)
    {
        switch ($extension) {
            case 'txt':
                $content = file_get_contents($filePath);
                return nl2br(htmlspecialchars($content));
                
            case 'docx':
                return $this->parseWordDocument($filePath);
                
            case 'doc':
                return '<p>DOC file loaded. Please convert to DOCX for better editing.</p><p>' . htmlspecialchars(basename($filePath)) . '</p>';
                
            case 'xlsx':
            case 'xls':
                return $this->parseExcelDocument($filePath);
                
            case 'pptx':
            case 'ppt':
                return $this->parsePowerPointDocument($filePath);
                
            default:
                return '<p>File loaded: ' . htmlspecialchars(basename($filePath)) . '</p>';
        }
    }

    private function parseWordDocument($filePath)
    {
        try {
            $phpWord = WordIOFactory::load($filePath);
            $html = '';
            
            foreach ($phpWord->getSections() as $section) {
                foreach ($section->getElements() as $element) {
                    $html .= $this->parseWordElement($element);
                }
            }
            
            if (empty($html)) {
                return '<p>Document: ' . htmlspecialchars(basename($filePath)) . '</p><p>Start editing your document...</p>';
            }
            
            return $html;
            
        } catch (\Exception $e) {
            \Log::error('Word parsing error: ' . $e->getMessage());
            return '<p>Document: ' . htmlspecialchars(basename($filePath)) . '</p><p>Start editing your document...</p>';
        }
    }

    private function parseWordElement($element)
    {
        $html = '';
        
        if (method_exists($element, 'getElements')) {
            foreach ($element->getElements() as $child) {
                $html .= $this->parseWordElement($child);
            }
        }
        
        if (method_exists($element, 'getText')) {
            $text = htmlspecialchars($element->getText());
            if (!empty($text)) {
                $html .= '<p>' . $text . '</p>';
            }
        }
        
        if ($element instanceof \PhpOffice\PhpWord\Element\TextRun) {
            $text = '';
            foreach ($element->getElements() as $textElement) {
                if (method_exists($textElement, 'getText')) {
                    $text .= htmlspecialchars($textElement->getText());
                }
            }
            if (!empty($text)) {
                $html .= '<p>' . $text . '</p>';
            }
        }
        
        if ($element instanceof \PhpOffice\PhpWord\Element\Title) {
            $text = htmlspecialchars($element->getText());
            if (!empty($text)) {
                $html .= '<h2>' . $text . '</h2>';
            }
        }
        
        if ($element instanceof \PhpOffice\PhpWord\Element\ListItem) {
            $text = htmlspecialchars($element->getText());
            if (!empty($text)) {
                $html .= '<li>' . $text . '</li>';
            }
        }
        
        return $html;
    }

    private function getEmptyContent($extension, $fileName)
    {
        if (in_array($extension, ['ppt', 'pptx'])) {
            return [
                'slides' => [
                    [
                        'id' => (string)time(),
                        'elements' => [
                            [
                                'id' => (string)time() . '_text',
                                'type' => 'text',
                                'content' => pathinfo($fileName, PATHINFO_FILENAME),
                                'x' => 100,
                                'y' => 200,
                                'width' => 760,
                                'height' => 100,
                                'styles' => [
                                    'fontSize' => 32,
                                    'fontFamily' => 'Arial',
                                    'color' => '#000000',
                                    'textAlign' => 'center',
                                    'bold' => true
                                ]
                            ]
                        ],
                        'background' => '#ffffff'
                    ]
                ]
            ];
        }
        
        if (in_array($extension, ['xls', 'xlsx'])) {
            return [['', '', ''], ['', '', ''], ['', '', '']];
        }
        
        if (in_array($extension, ['doc', 'docx'])) {
            return '<p>' . htmlspecialchars(pathinfo($fileName, PATHINFO_FILENAME)) . '</p><p>Start editing your document...</p>';
        }
        
        return '<p>' . htmlspecialchars($fileName) . '</p><p>Start editing your document...</p>';
    }
}